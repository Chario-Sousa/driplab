const { Router } = require('express');
const sequelize = require('../config/database');
const { autenticar, uuid } = require('../middleware/sessao');

const comentarios = Router();
const tamanhoPagina = 20;
const camposPublicos = 'c.id_comentario, c.autor, c.texto, c.publicado_em, c.editado_em';
const camposRetorno = camposPublicos + ", '/api/perfil/avatares/' || a.id_avatar as avatar_url";
const textoValido = texto => texto && Array.from(texto).length <= 500 && !texto.includes('\0');
const inteiroPositivo = valor => typeof valor === 'string' && /^[1-9]\d*$/.test(valor)
  && Number(valor) <= 2147483647;

function votacaoVisivel(coluna, parametro, bloquear = false) {
  if (coluna !== 'id_votacao') return 'true';
  return `exists (select 1 from public.votacao v
    where v.id_votacao = ${parametro}::uuid and v.oculta_em is null${bloquear ? ' for share' : ''})`;
}

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
  const produto = tipo === 'produto' && inteiroPositivo(alvo);
  if (!votacao && !drop && !produto) return res.status(400).json({ erro: 'Conversa inválida.' });

  try {
    const coluna = votacao ? 'id_votacao' : drop ? 'id_colecao' : 'id_produto';
    const valor = votacao ? alvo : Number(alvo);
    const tabela = votacao ? 'public.votacao' : drop ? 'public.colecao' : 'public.produto';
    const [[registro]] = await sequelize.query(
      `select 1 from ${tabela} where ${coluna} = $1${drop ? ' and ativa' : ''}${votacao ? ' and oculta_em is null' : ''}${produto ? ' and ativo' : ''}`,
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
      select ${camposRetorno}, coalesce(c.id_usuario = $1::uuid, false) as meu
      from public.comentario_comunidade c
      left join public.perfil_avatar a on a.id_usuario = c.id_usuario
      where c.${coluna} = $2 and ${votacaoVisivel(coluna, '$2')}
      ${antes === undefined ? '' : 'and c.id_comentario < $3::integer'}
      order by c.id_comentario desc
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
  if (!textoValido(conteudo)
      || typeof chave !== 'string' || !uuid.test(chave)) {
    return res.status(400).json({ erro: 'Escreva um comentário de até 500 caracteres.' });
  }
  const nome = req.nomePublico?.replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'Membro DripLab';
  const autor = Array.from(nome).slice(0, 80).join('');

  try {
    const { coluna, valor } = req.alvoComentario;
    const [[novo]] = await sequelize.query(`
      with criado as (
        insert into public.comentario_comunidade (id_usuario, chave_publicacao, autor, texto, ${coluna})
        select $1::uuid, $2::uuid, $3::text, $4::text, $5::${coluna === 'id_votacao' ? 'uuid' : 'integer'}
        where ${votacaoVisivel(coluna, '$5', true)}
        on conflict (id_usuario, chave_publicacao) do nothing
        returning *
      )
      select ${camposRetorno}, true as meu from criado c
      left join public.perfil_avatar a on a.id_usuario = c.id_usuario
    `, { bind: [req.idUsuario, chave, autor, conteudo, valor] });
    if (novo) return res.status(201).json(novo);

    const [[registro]] = await sequelize.query(`
      select ${camposRetorno}, true as meu, coalesce(c.texto_original, c.texto) as texto_original
      from public.comentario_comunidade c
      left join public.perfil_avatar a on a.id_usuario = c.id_usuario
      where c.id_usuario = $1::uuid and c.chave_publicacao = $2::uuid and c.${coluna} = $3
        and ${votacaoVisivel(coluna, '$3')}
    `, { bind: [req.idUsuario, chave, valor] });
    if (registro?.texto_original !== conteudo) {
      return res.status(409).json({ erro: 'Essa tentativa de publicação já foi utilizada.' });
    }
    const { texto_original, ...existente } = registro;
    res.json(existente);
  } catch (erro) {
    console.error('Falha ao publicar comentário:', erro.name);
    res.status(500).json({ erro: 'Não foi possível publicar o comentário.' });
  }
});

comentarios.patch('/:tipo/:alvo/:id', autenticar, resolverAlvo, async (req, res) => {
  const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
  if (!inteiroPositivo(req.params.id) || !textoValido(texto)) {
    return res.status(400).json({ erro: 'Escreva um comentário de até 500 caracteres.' });
  }
  try {
    const { coluna, valor } = req.alvoComentario;
    const [[comentario]] = await sequelize.query(`
      with alterado as (
        update public.comentario_comunidade
        set texto_original = coalesce(texto_original, texto), texto = $4,
          editado_em = case when texto is distinct from $4 then clock_timestamp() else editado_em end
        where id_comentario = $1::integer and id_usuario = $2::uuid and ${coluna} = $3
          and ${votacaoVisivel(coluna, '$3', true)}
        returning *
      )
      select ${camposRetorno}, true as meu from alterado c
      left join public.perfil_avatar a on a.id_usuario = c.id_usuario
    `, { bind: [Number(req.params.id), req.idUsuario, valor, texto] });
    if (!comentario) return res.status(404).json({ erro: 'Comentário não encontrado na sua conta.' });
    res.json(comentario);
  } catch (erro) {
    console.error('Falha ao editar comentário:', erro.name);
    res.status(500).json({ erro: 'Não foi possível editar o comentário.' });
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
        and ${votacaoVisivel(coluna, '$3', true)}
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
