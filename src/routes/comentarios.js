const { Router } = require('express');
const sequelize = require('../config/database');
const { autenticar, uuid } = require('../middleware/sessao');

const comentarios = Router();
const tamanhoPagina = 20;
const camposPublicos = 'id_comentario, autor, texto, publicado_em';
const inteiroPositivo = valor => typeof valor === 'string' && /^[1-9]\d*$/.test(valor)
  && Number(valor) <= 2147483647;

comentarios.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Comentários indisponíveis neste ambiente.' });
  }
  next();
});

function autenticarSeInformado(req, res, next) {
  if (req.get('Authorization')) return autenticar(req, res, next);
  next();
}

async function resolverAlvo(req, res, next) {
  const { tipo, alvo } = req.params;
  const votacao = tipo === 'votacao' && uuid.test(alvo);
  const drop = tipo === 'drop' && inteiroPositivo(alvo);
  if (!votacao && !drop) return res.status(400).json({ erro: 'Conversa inválida.' });

  try {
    const coluna = votacao ? 'id_votacao' : 'id_colecao';
    const valor = votacao ? alvo : Number(alvo);
    const tabela = votacao ? 'public.votacao' : 'public.colecao';
    const [[registro]] = await sequelize.query(
      `select 1 from ${tabela} where ${coluna} = $1${drop ? ' and ativa' : ''}`,
      { bind: [valor] }
    );
    if (!registro) return res.status(404).json({ erro: 'Conversa indisponível.' });
    req.alvoComentario = { coluna, valor };
    next();
  } catch (erro) {
    console.error('Falha ao localizar conversa:', erro.name);
    res.status(500).json({ erro: 'Não foi possível localizar a conversa.' });
  }
}

comentarios.get('/:tipo/:alvo', autenticarSeInformado, resolverAlvo, async (req, res) => {
  const { antes } = req.query;
  if (antes !== undefined && !inteiroPositivo(antes)) {
    return res.status(400).json({ erro: 'Página de comentários inválida.' });
  }

  try {
    const { coluna, valor } = req.alvoComentario;
    const [registros] = await sequelize.query(`
      select ${camposPublicos}, coalesce(id_usuario = $1::uuid, false) as meu
      from public.comentario_comunidade
      where ${coluna} = $2
      ${antes === undefined ? '' : 'and id_comentario < $3::integer'}
      order by id_comentario desc
      limit ${tamanhoPagina + 1}
    `, { bind: [req.idUsuario ?? null, valor, ...(antes === undefined ? [] : [Number(antes)])] });
    const itens = registros.slice(0, tamanhoPagina);
    res.json({ itens, proximo: registros.length > tamanhoPagina ? itens.at(-1).id_comentario : null });
  } catch (erro) {
    console.error('Falha ao carregar comentários:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar os comentários.' });
  }
});

comentarios.post('/:tipo/:alvo', autenticar, resolverAlvo, async (req, res) => {
  const { texto, chave_publicacao: chave } = req.body ?? {};
  const conteudo = typeof texto === 'string' ? texto.trim() : '';
  if (!conteudo || Array.from(conteudo).length > 500 || conteudo.includes('\0')
      || typeof chave !== 'string' || !uuid.test(chave)) {
    return res.status(400).json({ erro: 'Escreva um comentário de até 500 caracteres.' });
  }
  const nome = req.nomePublico?.replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'Membro DripLab';
  const autor = Array.from(nome).slice(0, 80).join('');

  try {
    const { coluna, valor } = req.alvoComentario;
    const [[novo]] = await sequelize.query(`
      insert into public.comentario_comunidade (id_usuario, chave_publicacao, autor, texto, ${coluna})
      values ($1::uuid, $2::uuid, $3, $4, $5)
      on conflict (id_usuario, chave_publicacao) do nothing
      returning ${camposPublicos}, true as meu
    `, { bind: [req.idUsuario, chave, autor, conteudo, valor] });
    if (novo) return res.status(201).json(novo);

    const [[existente]] = await sequelize.query(`
      select ${camposPublicos}, true as meu
      from public.comentario_comunidade
      where id_usuario = $1::uuid and chave_publicacao = $2::uuid and ${coluna} = $3
    `, { bind: [req.idUsuario, chave, valor] });
    if (existente?.texto !== conteudo) {
      return res.status(409).json({ erro: 'Essa tentativa de publicação já foi utilizada.' });
    }
    res.json(existente);
  } catch (erro) {
    console.error('Falha ao publicar comentário:', erro.name);
    res.status(500).json({ erro: 'Não foi possível publicar o comentário.' });
  }
});

comentarios.delete('/:tipo/:alvo/:id', autenticar, resolverAlvo, async (req, res) => {
  if (!inteiroPositivo(req.params.id)) {
    return res.status(400).json({ erro: 'Comentário inválido.' });
  }

  try {
    const { coluna, valor } = req.alvoComentario;
    const [[removido]] = await sequelize.query(`
      delete from public.comentario_comunidade
      where id_comentario = $1::integer and id_usuario = $2::uuid and ${coluna} = $3
      returning id_comentario
    `, { bind: [Number(req.params.id), req.idUsuario, valor] });
    if (!removido) return res.status(404).json({ erro: 'Comentário não encontrado na sua conta.' });
    res.status(204).end();
  } catch (erro) {
    console.error('Falha ao remover comentário:', erro.name);
    res.status(500).json({ erro: 'Não foi possível remover o comentário.' });
  }
});

module.exports = comentarios;
