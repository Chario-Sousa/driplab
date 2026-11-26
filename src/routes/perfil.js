const { Router, json } = require('express');
const sequelize = require('../config/database');
const { autenticar, uuid } = require('../middleware/sessao');
const { validarCapa, ErroCapa } = require('../capa');

const perfil = Router();
const urlAvatar = id => id ? '/api/perfil/avatares/' + id : null;

perfil.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (sequelize?.getDialect() !== 'postgres') return res.status(503).json({ erro: 'Foto indisponível neste ambiente.' });
  next();
});

perfil.get('/avatares/:id', async (req, res, next) => {
  if (!uuid.test(req.params.id)) return res.sendStatus(404);
  try {
    const [[arquivo]] = await sequelize.query(
      'select imagem, tipo from public.perfil_avatar where id_avatar = $1::uuid', { bind: [req.params.id] }
    );
    if (!arquivo) return res.sendStatus(404);
    res.set('X-Content-Type-Options', 'nosniff');
    res.type(arquivo.tipo).send(Buffer.from(arquivo.imagem));
  } catch (erro) {
    next(erro);
  }
});

perfil.use('/avatar', autenticar);
perfil.get('/avatar', async (req, res, next) => {
  try {
    const [[registro]] = await sequelize.query(
      'select id_avatar from public.perfil_avatar where id_usuario = $1::uuid', { bind: [req.idUsuario] }
    );
    res.json({ avatar_url: urlAvatar(registro?.id_avatar) });
  } catch (erro) {
    next(erro);
  }
});

perfil.put('/avatar', json({ limit: '1500kb' }), async (req, res, next) => {
  try {
    const { buffer, tipo } = validarCapa(req.body);
    const [[registro]] = await sequelize.query(`
      insert into public.perfil_avatar (id_usuario, imagem, tipo) values ($1::uuid, $2, $3)
      on conflict (id_usuario) do update
      set imagem = excluded.imagem, tipo = excluded.tipo, id_avatar = excluded.id_avatar
      returning id_avatar
    `, { bind: [req.idUsuario, buffer, tipo] });
    res.json({ avatar_url: urlAvatar(registro.id_avatar) });
  } catch (erro) {
    next(erro);
  }
});

perfil.delete('/avatar', async (req, res, next) => {
  try {
    await sequelize.query('delete from public.perfil_avatar where id_usuario = $1::uuid', { bind: [req.idUsuario] });
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

perfil.use((erro, req, res, next) => {
  if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'A foto deve ter até 1 MB.' });
  if (erro instanceof ErroCapa || erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Envie uma foto PNG, JPG ou WebP válida com até 1 MB.' });
  }
  console.error('Falha ao acessar foto de perfil:', erro.name);
  res.status(500).json({ erro: 'Não foi possível acessar a foto de perfil.' });
});

module.exports = perfil;
