const { Router } = require('express');
const { autenticar, uuid } = require('../middleware/sessao');
const sequelize = require('../config/database');

const pedidos = Router();

pedidos.use(autenticar);

pedidos.use((req, res, next) => {
  if (sequelize?.getDialect() !== 'postgres') {
    return res.status(503).json({ erro: 'Pedidos indisponíveis neste ambiente.' });
  }
  next();
});

pedidos.get('/', async (req, res) => {
  try {
    const [registros] = await sequelize.query(`
      select p.id_pedido, p.data_pedido, p.status, p.valor_total,
        jsonb_agg(jsonb_build_object(
          'nome_produto', produto.nome_produto,
          'quantidade', i.quantidade,
          'preco_unitario', i.preco_unitario
        ) order by i.id_produto) as itens
      from public.pedido p
      join public.item_pedido i on i.id_pedido = p.id_pedido
      join public.produto produto on produto.id_produto = i.id_produto
      where p.id_usuario = $1::uuid
      group by p.id_pedido
      order by p.data_pedido desc, p.id_pedido desc
    `, { bind: [req.idUsuario] });
    res.json(registros);
  } catch (erro) {
    console.error('Falha ao listar pedidos:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar seus pedidos.' });
  }
});

const inteiroPositivo = valor => Number.isInteger(valor) && valor > 0 && valor <= 2147483647;
const conflitos = {
  estoque_insuficiente: 'Estoque insuficiente para um dos produtos do carrinho.',
  produto_nao_encontrado: 'Um dos produtos não está mais disponível.',
  drop_fora_do_periodo: 'Um dos drops do carrinho está fora do período de venda.',
  limite_do_drop: 'A quantidade no carrinho supera o limite restante de um dos drops.',
  solicitacao_ja_utilizada: 'Essa tentativa já foi usada com outro carrinho.',
};

pedidos.post('/', async (req, res) => {
  const { chave_solicitacao: chave, itens } = req.body ?? {};
  if (typeof chave !== 'string' || !uuid.test(chave) || !Array.isArray(itens) || !itens.length
      || itens.some(item => !inteiroPositivo(item?.id_produto) || !inteiroPositivo(item?.quantidade))
      || new Set(itens.map(item => item.id_produto)).size !== itens.length) {
    return res.status(400).json({ erro: 'Confira os produtos e as quantidades do carrinho.' });
  }

  const produtos = itens.map(({ id_produto, quantidade }) => ({ id_produto, quantidade }));
  try {
    const [[pedido]] = await sequelize.query(
      'select public.criar_pedido($1::uuid, $2::uuid, $3::jsonb) as id_pedido',
      { bind: [req.idUsuario, chave, JSON.stringify(produtos)] }
    );
    res.json(pedido);
  } catch (erro) {
    const mensagem = conflitos[erro.original?.message];
    if (mensagem) return res.status(409).json({ erro: mensagem });
    console.error('Falha ao registrar pedido:', erro.name);
    res.status(500).json({ erro: 'Não foi possível registrar o pedido. Você pode tentar novamente.' });
  }
});

module.exports = pedidos;
