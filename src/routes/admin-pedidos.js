const { Router } = require('express');
const sequelize = require('../config/database');

const pedidos = Router();
const tamanhoPagina = 30;
const idValido = id => typeof id === 'string' && /^[1-9][0-9]{0,18}$/.test(id)
  && BigInt(id) <= 9223372036854775807n;

pedidos.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

pedidos.get('/', async (req, res) => {
  const { antes } = req.query;
  if (antes !== undefined && !idValido(antes)) return res.status(400).json({ erro: 'Página inválida.' });
  try {
    const [registros] = await sequelize.query(`
      select p.id_pedido::text, p.data_pedido, p.valor_total, u.email
      from public.pedido p
      join auth.users u on u.id = p.id_usuario
      where p.status = 'pendente' and ($1::bigint is null or p.id_pedido < $1::bigint)
      order by p.id_pedido desc
      limit $2
    `, { bind: [antes ?? null, tamanhoPagina + 1] });
    const itens = registros.slice(0, tamanhoPagina);
    res.json({ itens, proximo: registros.length > tamanhoPagina ? itens.at(-1).id_pedido : null });
  } catch (erro) {
    console.error('Falha ao listar pedidos pendentes:', erro.name);
    res.status(500).json({ erro: 'Não foi possível carregar os pedidos.' });
  }
});

pedidos.put('/:id/confirmacao', async (req, res) => {
  const { id } = req.params;
  if (!idValido(id)) return res.status(400).json({ erro: 'Pedido inválido.' });
  try {
    const [[pedido]] = await sequelize.query(`
      update public.pedido set status = 'confirmado'
      where id_pedido = $1::bigint and status = 'pendente'
      returning id_pedido::text
    `, { bind: [id] });
    if (pedido) return res.status(204).end();

    const [[atual]] = await sequelize.query(
      'select status from public.pedido where id_pedido = $1::bigint', { bind: [id] }
    );
    if (atual?.status === 'confirmado') return res.status(204).end();
    if (!atual) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    res.status(409).json({ erro: 'Somente pedidos pendentes podem ser confirmados.' });
  } catch (erro) {
    console.error('Falha ao confirmar pedido:', erro.name);
    res.status(500).json({ erro: 'Não foi possível confirmar o pedido.' });
  }
});

module.exports = pedidos;
