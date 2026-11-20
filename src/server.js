require('dotenv').config();

const express = require('express');
const path = require('path');
const sequelize = require('./config/database');

const app = express();

app.use(express.json());
app.use('/api/auth', require('./auth'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/produtos', async (req, res) => {
  try {
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
      FROM produto AS p
      JOIN categoria AS c
        ON c.id_categoria = p.fk_categoria_id_categoria
      LEFT JOIN colecao AS co
        ON co.id_colecao = p.fk_colecao_id_colecao
      ORDER BY p.id_produto;
    `);

    res.json(produtos);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Não foi possível buscar os produtos.' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ mensagem: 'API e banco conectados.' });
  } catch (erro) {
    console.error(erro.message);
    res.status(500).json({ mensagem: 'Falha na conexão com o banco.' });
  }
});

const porta = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o MySQL realizada.');
    app.listen(porta, () => {
      console.log(`DripLab disponível em http://localhost:${porta}`);
    });
  })
  .catch((erro) => {
    console.error('Não foi possível conectar ao MySQL:', erro.message);
    process.exit(1);
  });