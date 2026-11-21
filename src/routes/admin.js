const { Router, json } = require('express');
const sequelize = require('../config/database');
const { autenticar, uuid } = require('../middleware/sessao');
const { validarCapa, ErroCapa } = require('../capa');

const admin = Router();
const inteiro = (valor, min = 1) => Number.isInteger(valor) && valor >= min && valor <= 2147483647;
const consulta = (sql, bind = [], transaction) => sequelize.query(sql, { bind, transaction });

class ErroPainel extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function dataLocal(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(valor)) return null;
  const completa = valor.length === 16 ? valor + ':00' : valor;
  const data = new Date(completa + 'Z');
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 19) === completa ? completa : null;
}

function validarColecao(corpo, id) {
  const { nome, lancamento, encerramento, limite, ativa, produtos, mover, versao, capa,
    remover_capa: remover, chave_criacao: chave } = corpo ?? {};
  const inicio = dataLocal(lancamento);
  const fim = encerramento == null || encerramento === '' ? null : dataLocal(encerramento);
  if (typeof nome !== 'string' || !nome.trim() || Array.from(nome.trim()).length > 120
      || !inicio || (encerramento && !fim) || (fim && fim <= inicio)
      || !inteiro(limite, 0) || typeof ativa !== 'boolean' || (id && !inteiro(versao))) {
    throw new ErroPainel(400, 'Confira o nome, as datas e o limite de peças.');
  }
  if (!Array.isArray(produtos) || produtos.some(produto => !inteiro(produto))
      || new Set(produtos).size !== produtos.length || (capa && remover)) {
    throw new ErroPainel(400, 'Confira os produtos selecionados e a capa.');
  }
  if (!id && (typeof chave !== 'string' || !uuid.test(chave))) {
    throw new ErroPainel(400, 'Recarregue o painel para criar a coleção.');
  }
  return {
    nome: nome.trim(), inicio, fim, limite, ativa, produtos, mover: mover === true, versao, chave,
    capa: capa == null ? null : validarCapa(capa), remover: remover === true,
  };
}

admin.use(autenticar);
admin.use(async (req, res, next) => {
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Painel indisponível neste ambiente.' });
  }
  try {
    const [[acesso]] = await consulta('select 1 from public.administrador where id_usuario = $1::uuid', [req.idUsuario]);
    if (!acesso) return res.status(403).json({ erro: 'Esta conta não tem acesso ao painel.' });
  } catch (erro) {
    console.error('Falha ao validar acesso administrativo:', erro.name);
    return res.status(503).json({ erro: 'Não foi possível validar o acesso ao painel.' });
  }
  next();
});

admin.get('/acesso', (req, res) => res.status(204).end());
admin.use('/votacoes', require('./admin-votacoes'));
admin.get('/colecoes', async (req, res) => {
  try {
    const [[dados]] = await consulta(`
      select
        (select coalesce(jsonb_agg(to_jsonb(c) order by c.id_colecao desc), '[]'::jsonb)
         from (
           select id_colecao, nome_colecao, ativa, limite_pecas, versao, capa is not null as tem_capa,
             to_char(data_lancamento at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI:SS') as lancamento,
             to_char(data_encerramento at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI:SS') as encerramento
           from public.colecao
         ) c) as colecoes,
        (select coalesce(jsonb_agg(to_jsonb(p) order by p.nome_produto, p.id_produto), '[]'::jsonb)
         from (
           select id_produto, nome_produto, fk_colecao_id_colecao as id_colecao from public.produto
         ) p) as produtos
    `);
    res.json(dados);
  } catch (erro) {
    console.error('Falha ao carregar painel:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar o painel.' });
  }
});

async function salvarColecao(id, dados, transaction) {
  if (!id) {
    await consulta('select pg_advisory_xact_lock(hashtextextended($1, 0))', [dados.chave], transaction);
    const [[existente]] = await consulta('select id_colecao from public.colecao where chave_criacao = $1::uuid',
      [dados.chave], transaction);
    if (existente) return existente.id_colecao;
  }

  const [produtos] = await consulta(`
    select id_produto, fk_colecao_id_colecao as id_colecao
    from public.produto
    where fk_colecao_id_colecao = $1::integer or id_produto = any($2::integer[])
    order by id_produto for update
  `, [id, dados.produtos], transaction);
  const selecionados = new Set(dados.produtos);
  const vinculados = produtos.filter(produto => selecionados.has(produto.id_produto));
  if (vinculados.length !== selecionados.size) throw new ErroPainel(400, 'Um produto selecionado não existe.');
  const origens = [...new Set(vinculados.map(produto => produto.id_colecao).filter(origem => origem && origem !== id))];
  if (origens.length && !dados.mover) throw new ErroPainel(409, 'Confirme a movimentação de produtos de outros drops.');

  const [colecoes] = await consulta(`
    select id_colecao, versao from public.colecao
    where id_colecao = any($1::integer[])
    order by id_colecao for no key update
  `, [[...origens, ...(id ? [id] : [])]], transaction);
  const atual = colecoes.find(colecao => colecao.id_colecao === id);
  if (id && !atual) throw new ErroPainel(404, 'Coleção não encontrada.');
  if (id && atual.versao !== dados.versao) {
    throw new ErroPainel(409, 'A coleção mudou. Recarregue o painel antes de editar.');
  }

  const campos = [dados.nome, dados.inicio, dados.fim, dados.limite, dados.ativa,
    dados.capa?.buffer ?? null, dados.capa?.tipo ?? null];
  let destino = id;
  if (id) {
    await consulta(`
      update public.colecao
      set nome_colecao = $1, data_lancamento = $2::timestamp at time zone 'America/Sao_Paulo',
          data_encerramento = $3::timestamp at time zone 'America/Sao_Paulo',
          limite_pecas = $4, ativa = $5,
          capa = case when $8 or $6::bytea is not null then $6 else capa end,
          capa_tipo = case when $8 or $7::text is not null then $7 else capa_tipo end,
          versao = versao + 1
      where id_colecao = $9
    `, [...campos, dados.remover, id], transaction);
  } else {
    const [[criada]] = await consulta(`
      insert into public.colecao (
        nome_colecao, data_lancamento, data_encerramento, limite_pecas, ativa, capa, capa_tipo, chave_criacao
      )
      values ($1, $2::timestamp at time zone 'America/Sao_Paulo', $3::timestamp at time zone 'America/Sao_Paulo',
        $4, $5, $6, $7, $8::uuid)
      returning id_colecao
    `, [...campos, dados.chave], transaction);
    destino = criada.id_colecao;
  }

  await consulta(`
    update public.produto
    set fk_colecao_id_colecao = case when id_produto = any($1::integer[]) then $2::integer end
    where id_produto = any($3::integer[])
      and fk_colecao_id_colecao is distinct from
        (case when id_produto = any($1::integer[]) then $2::integer end)
  `, [dados.produtos, destino, produtos.map(produto => produto.id_produto)], transaction);
  if (origens.length) {
    await consulta('update public.colecao set versao = versao + 1 where id_colecao = any($1::integer[])',
      [origens], transaction);
  }

  return destino;
}

async function enviarColecao(req, res) {
  try {
    const id = req.params.id === undefined ? null : Number(req.params.id);
    if (id !== null && (!/^[1-9]\d*$/.test(req.params.id) || !inteiro(id))) {
      throw new ErroPainel(400, 'Coleção inválida.');
    }
    const dados = validarColecao(req.body, id);
    const idColecao = await sequelize.transaction(transaction => salvarColecao(id, dados, transaction));
    res.status(id ? 200 : 201).json({ id_colecao: idColecao });
  } catch (erro) {
    if (erro instanceof ErroPainel) return res.status(erro.status).json({ erro: erro.message });
    if (erro instanceof ErroCapa) return res.status(400).json({ erro: erro.message });
    if (erro.original?.constraint === 'periodo_colecao_valido') {
      return res.status(400).json({ erro: 'O encerramento deve ser posterior ao lançamento.' });
    }
    console.error('Falha ao salvar coleção:', erro.name);
    res.status(500).json({ erro: 'Não foi possível salvar a coleção.' });
  }
}

const lerColecao = json({ limit: '1500kb' });
admin.post('/colecoes', lerColecao, enviarColecao);
admin.put('/colecoes/:id', lerColecao, enviarColecao);
admin.use((erro, req, res, next) => {
  if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'A capa deve ter até 1 MB.' });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados inválidos.' });
  next(erro);
});

module.exports = admin;
