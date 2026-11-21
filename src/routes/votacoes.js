const { Router } = require('express');
const sequelize = require('../config/database');
const { autenticar, uuid } = require('../middleware/sessao');

const votacoes = Router();

votacoes.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

function bancoDisponivel(req, res, next) {
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Votações indisponíveis neste ambiente.' });
  }
  next();
}

votacoes.get('/', bancoDisponivel, async (req, res) => {
  try {
    const [[votacao]] = await sequelize.query(`
      with atual as (
        select id_votacao, titulo, encerrada_em from public.votacao
        order by (encerrada_em is null) desc, criada_em desc, id_votacao
        limit 1
      ), resultados as (
        select o.id_opcao, o.nome, count(v.id_opcao) as votos
        from atual a
        join public.opcao_votacao o using (id_votacao)
        left join public.voto v using (id_votacao, id_opcao)
        group by o.id_opcao, o.nome
      )
      select a.*, (
        select coalesce(jsonb_agg(to_jsonb(r) order by r.id_opcao), '[]'::jsonb) from resultados r
      ) as opcoes
      from atual a
    `);
    res.json({ votacao: votacao || null });
  } catch (erro) {
    console.error('Falha ao carregar votação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar a votação.' });
  }
});

function validarId(req, res, next) {
  if (!uuid.test(req.params.id)) return res.status(400).json({ erro: 'Votação inválida.' });
  next();
}

votacoes.get('/:id/meu-voto', autenticar, bancoDisponivel, validarId, async (req, res) => {
  try {
    const [[voto]] = await sequelize.query(
      'select id_opcao from public.voto where id_votacao = $1::uuid and id_usuario = $2::uuid',
      { bind: [req.params.id, req.idUsuario] }
    );
    res.json({ id_opcao: voto?.id_opcao ?? null });
  } catch (erro) {
    console.error('Falha ao carregar voto da conta:', erro.name);
    res.status(500).json({ erro: 'Não foi possível consultar seu voto.' });
  }
});

votacoes.post('/:id/meu-voto', autenticar, bancoDisponivel, validarId, async (req, res) => {
  const { id_opcao: opcao } = req.body ?? {};
  if (!Number.isInteger(opcao) || opcao < 1 || opcao > 4) {
    return res.status(400).json({ erro: 'Selecione uma opção válida.' });
  }

  try {
    const resultado = await sequelize.transaction(async transaction => {
      const bind = [req.params.id, req.idUsuario];
      const [[votacao]] = await sequelize.query(
        'select encerrada_em from public.votacao where id_votacao = $1::uuid for share',
        { bind: [req.params.id], transaction }
      );
      if (!votacao) return { status: 404, erro: 'Votação não encontrada.' };
      if (votacao.encerrada_em) return { status: 409, erro: 'Esta votação foi encerrada.' };

      const [[voto]] = await sequelize.query(`
        insert into public.voto (id_votacao, id_usuario, id_opcao)
        select o.id_votacao, $2::uuid, o.id_opcao
        from public.opcao_votacao o
        where o.id_votacao = $1::uuid and o.id_opcao = $3
        on conflict (id_votacao, id_usuario) do nothing
        returning id_opcao
      `, { bind: [...bind, opcao], transaction });
      if (voto) return { status: 201, id_opcao: voto.id_opcao };

      const [[existente]] = await sequelize.query(
        'select id_opcao from public.voto where id_votacao = $1::uuid and id_usuario = $2::uuid',
        { bind, transaction }
      );
      if (existente?.id_opcao === opcao) return { status: 200, id_opcao: existente.id_opcao };
      if (existente) return { status: 409, erro: 'Você já votou nesta enquete.' };
      return { status: 400, erro: 'Selecione uma opção válida.' };
    });
    const { status, ...corpo } = resultado;
    res.status(status).json(corpo);
  } catch (erro) {
    console.error('Falha ao registrar voto:', erro.name);
    res.status(500).json({ erro: 'Não foi possível registrar seu voto.' });
  }
});

module.exports = votacoes;
