const { url, chavePublica } = require('../../public/auth-config.json');

const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

async function autenticar(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const token = req.get('Authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });

  try {
    const resposta = await fetch(new URL('/auth/v1/user', url), {
      headers: { apikey: chavePublica, Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    });
    if ([400, 401, 403].includes(resposta.status)) {
      return res.status(401).json({ erro: 'Sua sessão expirou. Entre novamente.' });
    }
    if (!resposta.ok) {
      return res.status(503).json({ erro: 'Não foi possível validar sua sessão. Tente novamente.' });
    }
    const usuario = await resposta.json();
    if (typeof usuario.id !== 'string' || !uuid.test(usuario.id)) {
      return res.status(401).json({ erro: 'Sua sessão expirou. Entre novamente.' });
    }
    req.idUsuario = usuario.id;
    if (typeof usuario.user_metadata?.nome === 'string') {
      req.nomePublico = usuario.user_metadata.nome;
    }
  } catch {
    return res.status(503).json({ erro: 'Não foi possível validar sua sessão. Tente novamente.' });
  }

  next();
}

module.exports = { autenticar, uuid };
