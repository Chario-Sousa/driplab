const { createHash, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { Router } = require('express');
const { QueryTypes } = require('sequelize');
const banco = require('./config/database');

const router = Router();
const derivarSenha = promisify(scrypt);
const cookie = 'driplab_sessao';
const dia = 24 * 60 * 60 * 1000;
const opcoesCookie = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const camposUsuario = 'u.id_usuario, u.nome, u.email, u.pontos, u.xp, u.avatar, u.data_criacao';
const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST' && (!req.is('application/json') || req.get('Sec-Fetch-Site') === 'cross-site')) {
    return res.status(415).json({ erro: 'Envie a solicitação em JSON pelo site da DripLab.' });
  }
  next();
});

function lerCredenciais(body = {}) {
  return {
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    senha: typeof body.senha === 'string' ? body.senha : '',
  };
}

function credenciaisValidas(email, senha) {
  return email.length <= 255 && emailValido.test(email) && senha.length >= 8 && senha.length <= 128;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function lerToken(req) {
  const cookies = req.get('Cookie') || '';
  return cookies.match(/(?:^|;\s*)driplab_sessao=([a-f0-9]{64})(?=;|$)/)?.[1];
}

async function apagarSessao(token, transaction) {
  if (token) {
    await banco.query('DELETE FROM sessao_usuario WHERE token_hash = :hash', {
      replacements: { hash: hashToken(token) },
      transaction,
    });
  }
}

async function criarSessao(req, id, manter, transaction) {
  const token = randomBytes(32).toString('hex');
  const dias = manter ? 30 : 1;
  await apagarSessao(lerToken(req), transaction);
  await banco.query(`
    DELETE FROM sessao_usuario WHERE id_usuario = :id AND expira_em <= UTC_TIMESTAMP()
  `, { replacements: { id }, transaction });
  await banco.query(`
    INSERT INTO sessao_usuario (token_hash, id_usuario, expira_em)
    VALUES (:hash, :id, DATE_ADD(UTC_TIMESTAMP(), INTERVAL :dias DAY))
  `, { replacements: { hash: hashToken(token), id, dias }, transaction });
  return token;
}

router.post('/cadastro', async (req, res) => {
  const { email, senha } = lerCredenciais(req.body);
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
  if (!nome || nome.length > 120 || !credenciaisValidas(email, senha) || req.body.termos !== true) {
    return res.status(400).json({ erro: 'Informe nome, e-mail, senha de 8 a 128 caracteres e aceite os termos.' });
  }

  const sal = randomBytes(16).toString('hex');
  const senhaHash = (await derivarSenha(senha, sal, 64)).toString('hex');
  try {
    const token = await banco.transaction(async (transaction) => {
      const [id] = await banco.query(`
        INSERT INTO usuario (nome, email, senha) VALUES (:nome, :email, :senha)
      `, {
        replacements: { nome, email, senha: `scrypt:${sal}:${senhaHash}` },
        type: QueryTypes.INSERT,
        transaction,
      });
      return criarSessao(req, id, false, transaction);
    });
    return res.cookie(cookie, token, opcoesCookie).status(201).end();
  } catch (erro) {
    if (erro.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });
    }
    throw erro;
  }
});

router.post('/login', async (req, res) => {
  const { email, senha } = lerCredenciais(req.body);
  if (!credenciaisValidas(email, senha)) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  const [usuario] = await banco.query('SELECT id_usuario, senha FROM usuario WHERE email = :email LIMIT 1', {
    replacements: { email },
    type: QueryTypes.SELECT,
  });
  const senhaSalva = usuario?.senha.match(/^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/);
  const calculado = await derivarSenha(senha, senhaSalva?.[1] || '00000000000000000000000000000000', 64);
  if (!senhaSalva || !timingSafeEqual(calculado, Buffer.from(senhaSalva[2], 'hex'))) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  const manter = req.body.manter === true;
  const token = await banco.transaction((transaction) => criarSessao(req, usuario.id_usuario, manter, transaction));
  const opcoes = manter ? { ...opcoesCookie, maxAge: 30 * dia } : opcoesCookie;
  return res.cookie(cookie, token, opcoes).status(204).end();
});

router.get('/perfil', async (req, res) => {
  const token = lerToken(req);
  if (token) {
    const [usuario] = await banco.query(`
      SELECT ${camposUsuario}
      FROM sessao_usuario AS s
      JOIN usuario AS u ON u.id_usuario = s.id_usuario
      WHERE s.token_hash = :hash AND s.expira_em > UTC_TIMESTAMP()
    `, { replacements: { hash: hashToken(token) }, type: QueryTypes.SELECT });
    if (usuario) return res.json(usuario);
  }
  return res.status(401).json({ erro: 'Entre para acessar seu perfil.' });
});

router.post('/logout', async (req, res) => {
  await apagarSessao(lerToken(req));
  return res.clearCookie(cookie, opcoesCookie).status(204).end();
});

router.use((erro, req, res, next) => {
  console.error('Falha na autenticação:', erro.original?.code || erro.name);
  res.status(500).json({ erro: 'Não foi possível concluir a solicitação. Tente novamente.' });
});

module.exports = router;
