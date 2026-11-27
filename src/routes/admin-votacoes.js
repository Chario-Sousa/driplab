const { Router, json } = require('express');
const sequelize = require('../config/database');
const { uuid } = require('../middleware/sessao');
const { validarCapa, ErroCapa } = require('../capa');

const votacoes = Router();

votacoes.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

votacoes.get('/', async (req, res) => {
  try {
    const [lista] = await sequelize.query(`
      select v.id_votacao, v.titulo, v.encerrada_em, v.oculta_em,
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'id_opcao', o.id_opcao, 'nome', o.nome, 'tem_capa', o.capa is not null
          ) order by o.id_opcao)
          from public.opcao_votacao o where o.id_votacao = v.id_votacao
        ), '[]'::jsonb) as opcoes
      from public.votacao v
      order by (v.encerrada_em is null) desc, v.criada_em desc, v.id_votacao
    `);
    res.json({ votacoes: lista });
  } catch (erro) {
    console.error('Falha ao listar votações:', erro.name);
    res.status(500).json({ erro: 'Não foi possível listar as votações.' });
  }
});

votacoes.post('/', json({ limit: '8kb' }), async (req, res) => {
  const { id_votacao: id, titulo, opcoes } = req.body ?? {};
  if (typeof id !== 'string' || !uuid.test(id) || typeof titulo !== 'string'
      || !titulo.trim() || Array.from(titulo.trim()).length > 160
      || !Array.isArray(opcoes) || opcoes.length < 2 || opcoes.length > 4
      || opcoes.some(opcao => typeof opcao !== 'string' || !opcao.trim() || Array.from(opcao.trim()).length > 100)) {
    return res.status(400).json({ erro: 'Informe uma pergunta e de duas a quatro opções.' });
  }
  const nomes = opcoes.map(opcao => opcao.trim());
  if (new Set(nomes.map(opcao => opcao.normalize('NFC').toLocaleLowerCase('pt-BR'))).size !== nomes.length) {
    return res.status(400).json({ erro: 'As opções da votação devem ser diferentes.' });
  }

  try {
    const criada = await sequelize.transaction(async transaction => {
      const [[criada]] = await sequelize.query(`
        insert into public.votacao (id_votacao, titulo) values ($1::uuid, $2)
        on conflict (id_votacao) do nothing
        returning id_votacao
      `, { bind: [id, titulo.trim()], transaction });
      if (!criada) return false;

      await sequelize.query(`
        insert into public.opcao_votacao (id_votacao, id_opcao, nome)
        select $1::uuid, posicao, nome from unnest($2::text[]) with ordinality as o(nome, posicao)
      `, { bind: [id, nomes], transaction });
      return true;
    });
    res.status(criada ? 201 : 200).json({ id_votacao: id });
  } catch (erro) {
    if (erro.original?.constraint === 'votacao_uma_aberta') {
      return res.status(409).json({ erro: 'Encerre a votação atual antes de abrir outra.' });
    }
    console.error('Falha ao abrir votação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível abrir a votação.' });
  }
});

votacoes.put('/:id/encerramento', async (req, res) => {
  if (!uuid.test(req.params.id)) return res.status(400).json({ erro: 'Votação inválida.' });

  try {
    const [[votacao]] = await sequelize.query(`
      update public.votacao set encerrada_em = coalesce(encerrada_em, clock_timestamp())
      where id_votacao = $1::uuid
      returning encerrada_em
    `, { bind: [req.params.id] });
    if (!votacao) return res.status(404).json({ erro: 'Votação não encontrada.' });
    res.json(votacao);
  } catch (erro) {
    console.error('Falha ao encerrar votação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível encerrar a votação.' });
  }
});

votacoes.put('/:id/visibilidade', json({ limit: '1kb' }), async (req, res) => {
  const { id } = req.params;
  const { oculta } = req.body ?? {};
  if (!uuid.test(id) || typeof oculta !== 'boolean') {
    return res.status(400).json({ erro: 'Informe a votação e a visibilidade desejada.' });
  }
  try {
    const [[votacao]] = await sequelize.query(`
      update public.votacao
      set oculta_em = case when $2::boolean then coalesce(oculta_em, clock_timestamp()) end,
          encerrada_em = case when $2::boolean then coalesce(encerrada_em, clock_timestamp()) else encerrada_em end
      where id_votacao = $1::uuid
      returning encerrada_em, oculta_em
    `, { bind: [id, oculta] });
    if (!votacao) return res.status(404).json({ erro: 'Votação não encontrada.' });
    res.json(votacao);
  } catch (erro) {
    console.error('Falha ao alterar visibilidade da votação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível alterar a visibilidade da votação.' });
  }
});

votacoes.delete('/:id', json({ limit: '1kb' }), async (req, res) => {
  const { id } = req.params;
  if (!uuid.test(id) || req.body?.confirmar !== true) {
    return res.status(400).json({ erro: 'Confirme a exclusão definitiva da votação.' });
  }
  try {
    await sequelize.query('delete from public.votacao where id_votacao = $1::uuid', { bind: [id] });
    res.status(204).end();
  } catch (erro) {
    console.error('Falha ao excluir votação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível excluir a votação.' });
  }
});

votacoes.get('/:id/opcoes/:opcao/capa', async (req, res) => {
  const { id, opcao } = req.params;
  if (!uuid.test(id) || !/^[1-4]$/.test(opcao)) return res.sendStatus(404);
  try {
    const [[imagem]] = await sequelize.query(`
      select capa, capa_tipo from public.opcao_votacao
      where id_votacao = $1::uuid and id_opcao = $2 and capa is not null
    `, { bind: [id, Number(opcao)] });
    if (!imagem) return res.sendStatus(404);
    res.set('Content-Type', imagem.capa_tipo);
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(imagem.capa);
  } catch (erro) {
    console.error('Falha ao carregar capa administrativa:', erro.name);
    res.sendStatus(500);
  }
});

votacoes.put('/:id/opcoes/:opcao/capa', json({ limit: '1500kb' }), async (req, res) => {
  const { id, opcao } = req.params;
  if (!uuid.test(id) || !/^[1-4]$/.test(opcao)) {
    return res.status(400).json({ erro: 'Opção de votação inválida.' });
  }

  try {
    const { tipo, buffer } = validarCapa(req.body?.capa);
    const [[salva]] = await sequelize.query(`
      update public.opcao_votacao set capa = $3, capa_tipo = $4
      where id_votacao = $1::uuid and id_opcao = $2
      returning id_opcao
    `, { bind: [id, Number(opcao), buffer, tipo] });
    if (!salva) return res.status(404).json({ erro: 'Opção de votação não encontrada.' });
    res.status(204).end();
  } catch (erro) {
    if (erro instanceof ErroCapa) return res.status(400).json({ erro: erro.message });
    console.error('Falha ao salvar capa de votação:', erro.name);
    res.status(500).json({ erro: 'Não foi possível salvar a capa.' });
  }
});

module.exports = votacoes;
