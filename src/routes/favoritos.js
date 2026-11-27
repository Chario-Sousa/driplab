const { Router } = require('express');
const sequelize = require('../config/database');
const { autenticar } = require('../middleware/sessao');

const favoritos = Router();

favoritos.use(autenticar);
favoritos.use((req, res, next) => {
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Favoritos indisponíveis neste ambiente.' });
  }
  next();
});

favoritos.get('/', async (req, res) => {
  try {
    const [produtos] = await sequelize.query(`
      select p.id_produto, p.nome_produto, p.imagem_url
      from public.favorito f
      join public.produto p on p.id_produto = f.id_produto and p.ativo
      where f.id_usuario = $1::uuid
      order by f.criado_em desc, p.id_produto
    `, { bind: [req.idUsuario] });
    res.json(produtos);
  } catch (erro) {
    console.error('Falha ao listar favoritos:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar seus favoritos.' });
  }
});

favoritos.param('id', (req, res, next, valor) => {
  const id = Number(valor);
  if (!/^[1-9]\d*$/.test(valor) || !Number.isInteger(id) || id > 2147483647) {
    return res.status(400).json({ erro: 'Produto inválido.' });
  }
  req.idProduto = id;
  next();
});

favoritos.put('/:id', async (req, res) => {
  try {
    const [[produto]] = await sequelize.query(`
      with produto as (
        select id_produto, nome_produto, imagem_url from public.produto where id_produto = $2 and ativo
      ), salvo as (
        insert into public.favorito (id_usuario, id_produto)
        select $1::uuid, id_produto from produto
        on conflict (id_usuario, id_produto) do nothing
      )
      select id_produto, nome_produto, imagem_url from produto
    `, { bind: [req.idUsuario, req.idProduto] });

    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(produto);
  } catch (erro) {
    console.error('Falha ao salvar favorito:', erro.name);
    res.status(500).json({ erro: 'Não foi possível salvar o produto.' });
  }
});

favoritos.delete('/:id', async (req, res) => {
  try {
    await sequelize.query('delete from public.favorito where id_usuario = $1::uuid and id_produto = $2',
      { bind: [req.idUsuario, req.idProduto] });
    res.status(204).end();
  } catch (erro) {
    console.error('Falha ao remover favorito:', erro.name);
    res.status(500).json({ erro: 'Não foi possível remover o produto.' });
  }
});

module.exports = favoritos;
