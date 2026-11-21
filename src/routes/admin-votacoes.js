const { Router, json } = require('express');
const sequelize = require('../config/database');
const { uuid } = require('../middleware/sessao');
const { validarCapa, ErroCapa } = require('../capa');

const votacoes = Router();

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
