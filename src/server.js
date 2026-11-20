require('dotenv').config();

const express = require('express');
const path = require('path');
const sequelize = require('./config/database');
const pedidos = require('./routes/pedidos');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/pedidos', pedidos);

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
        p.preco,
        p.estoque,
        c.nome_categoria,
        co.nome_colecao
        ${postgres ? ', d.estado as estado_drop' : ''}
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
        coalesce(jsonb_agg(to_jsonb(d) order by d.data_lancamento, d.id_colecao), '[]'::jsonb) as drops
      from public.disponibilidade_drop d
      where d.estado <> 'inativo'
    `);
    res.json(disponibilidade);
  } catch (erro) {
    console.error('Falha na consulta de drops:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar os drops.' });
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
