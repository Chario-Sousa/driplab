require('dotenv').config();

const express = require('express');
const path = require('path');
const sequelize = require('./config/database');
const pedidos = require('./routes/pedidos');
const favoritos = require('./routes/favoritos');
const admin = require('./routes/admin');
const votacoes = require('./routes/votacoes');
const comentarios = require('./routes/comentarios');
const gamificacao = require('./routes/gamificacao');

const app = express();

app.use('/api/admin', admin);
app.use('/api/perfil', require('./routes/perfil'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/pedidos', pedidos);
app.use('/api/favoritos', favoritos);
app.use('/api/votacoes', votacoes);
app.use('/api/comentarios', comentarios);
app.use('/api/gamificacao', gamificacao);

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.get('/api/produtos', async (req, res) => {
  if (!sequelize) {
    return res.status(503).json({ erro: 'Conexão com o banco ainda não configurada.' });
  }

  try {
    const postgres = sequelize.getDialect() === 'postgres';
    const [produtos] = await sequelize.query(`
      SELECT
        p.id_produto,
        p.nome_produto,
        p.descricao_produto,
        p.imagem_url,
        ${postgres ? 'p.imagem_detalhe_url' : 'null as imagem_detalhe_url'},
        p.preco,
        p.estoque,
        c.nome_categoria,
        ${postgres ? "CASE WHEN d.estado <> 'inativo' THEN co.id_colecao END" : 'co.id_colecao'} AS id_colecao,
        ${postgres ? "CASE WHEN d.estado <> 'inativo' THEN co.nome_colecao END" : 'co.nome_colecao'} AS nome_colecao
        ${postgres ? ", d.estado as estado_drop, CASE WHEN d.estado <> 'inativo' THEN co.nivel_minimo END AS nivel_minimo" : ''}
      FROM produto AS p
      JOIN categoria AS c
        ON c.id_categoria = p.fk_categoria_id_categoria
      LEFT JOIN colecao AS co
        ON co.id_colecao = p.fk_colecao_id_colecao
      ${postgres ? 'LEFT JOIN public.disponibilidade_drop AS d ON d.id_colecao = co.id_colecao' : ''}
      ORDER BY p.id_produto;
    `);

    res.json(produtos);
  } catch (erro) {
    console.error('Falha na consulta de produtos:', erro.name);
    res.status(500).json({ erro: 'Não foi possível buscar os produtos.' });
  }
});

app.get('/api/drops', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Drops indisponíveis neste ambiente.' });
  }

  try {
    const [[disponibilidade]] = await sequelize.query(`
      select clock_timestamp() as agora,
        coalesce(jsonb_agg(
          to_jsonb(d) || jsonb_build_object(
            'nivel_minimo', c.nivel_minimo,
            'capa_url', case when c.capa is not null then '/api/drops/' || d.id_colecao || '/capa?v=' || c.versao end)
          order by d.data_lancamento, d.id_colecao), '[]'::jsonb) as drops
      from public.disponibilidade_drop d
      join public.colecao c on c.id_colecao = d.id_colecao
      where d.estado <> 'inativo'
    `);
    res.json(disponibilidade);
  } catch (erro) {
    console.error('Falha na consulta de drops:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar os drops.' });
  }
});

app.get('/api/drops/:id/capa', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (sequelize?.getDialect() !== 'postgres') return res.sendStatus(503);
  const id = Number(req.params.id);
  if (!/^[1-9]\d*$/.test(req.params.id) || id > 2147483647) return res.sendStatus(404);

  try {
    const [[imagem]] = await sequelize.query(`
      select capa, capa_tipo from public.colecao
      where id_colecao = $1 and ativa and capa is not null
    `, { bind: [id] });
    if (!imagem) return res.sendStatus(404);
    res.set('Content-Type', imagem.capa_tipo);
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(imagem.capa);
  } catch (erro) {
    console.error('Falha ao carregar capa de drop:', erro.name);
    res.sendStatus(500);
  }
});

app.get('/api/health', async (req, res) => {
  if (!sequelize) {
    return res.status(503).json({ mensagem: 'Conexão com o banco ainda não configurada.' });
  }

  try {
    await sequelize.authenticate();
    res.json({ mensagem: 'API e banco conectados.' });
  } catch (erro) {
    console.error('Falha na conexão com o banco:', erro.name);
    res.status(500).json({ mensagem: 'Falha na conexão com o banco.' });
  }
});

if (require.main === module && !process.env.VERCEL) {
  const porta = process.env.PORT || 3000;
  app.listen(porta, (erro) => {
    if (erro) {
      if (erro.code === 'EADDRINUSE') {
        console.error(`A porta ${porta} já está em uso. Encerre o servidor anterior ou escolha outra porta.`);
      } else {
        console.error('Não foi possível iniciar o DripLab:', erro.message);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`DripLab disponível em http://localhost:${porta}`);
  });
}

module.exports = app;
