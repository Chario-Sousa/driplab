const { Router, json } = require('express');
const sequelize = require('../config/database');
const { uuid } = require('../middleware/sessao');
const { validarCapa, ErroCapa } = require('../capa');

const produtos = Router();
const lerProduto = json({ limit: '1500kb' });
const inteiro = (valor, min = 1) => Number.isInteger(valor) && valor >= min && valor <= 2147483647;
const consulta = (sql, bind = []) => sequelize.query(sql, { bind });

produtos.param('id', (req, res, next, valor) => {
  req.idProduto = Number(valor);
  if (!/^[1-9]\d*$/.test(valor) || !inteiro(req.idProduto)) {
    return res.status(400).json({ erro: 'Produto inválido.' });
  }
  next();
});

produtos.get('/', async (req, res) => {
  try {
    const [[dados]] = await consulta(`
      select
        (select coalesce(jsonb_agg(to_jsonb(c) order by c.nome_categoria, c.id_categoria), '[]'::jsonb)
         from public.categoria c) as categorias,
        (select coalesce(jsonb_agg(to_jsonb(p) order by p.nome_produto, p.id_produto), '[]'::jsonb)
         from (
           select p.id_produto, p.nome_produto, p.descricao_produto, p.preco::text, p.estoque,
             p.fk_categoria_id_categoria as id_categoria, p.ativo, p.versao, p.imagem_url,
             c.nome_colecao
           from public.produto p
           left join public.colecao c on c.id_colecao = p.fk_colecao_id_colecao
         ) p) as produtos
    `);
    res.json(dados);
  } catch (erro) {
    falha(res, erro);
  }
});

function validarProduto(corpo, editando) {
  const { nome, descricao, preco, estoque, categoria, ativo, chave, versao, foto, remover_foto } = corpo ?? {};
  if (typeof nome !== 'string' || !nome.trim() || Array.from(nome.trim()).length > 150 || nome.includes('\0')
      || typeof descricao !== 'string' || !descricao.trim() || Array.from(descricao.trim()).length > 2000
      || descricao.includes('\0') || typeof preco !== 'string' || !/^\d{1,8}([.,]\d{1,2})?$/.test(preco)
      || !inteiro(estoque, 0) || !inteiro(categoria) || typeof ativo !== 'boolean'
      || (editando ? !inteiro(versao) : typeof chave !== 'string' || !uuid.test(chave))
      || (foto != null && remover_foto === true)) {
    return null;
  }
  const imagem = foto == null ? null : validarCapa(foto);
  return {
    campos: [nome.trim(), descricao.trim(), preco.replace(',', '.'), estoque, categoria, ativo,
      imagem?.buffer ?? null, imagem?.tipo ?? null],
    chave, versao, remover: remover_foto === true,
  };
}

function falha(res, erro) {
  if (erro instanceof ErroCapa) {
    return res.status(400).json({ erro: 'Envie uma foto válida em PNG, JPG ou WebP com até 1 MB.' });
  }
  if (erro.original?.code === '42703' || erro.original?.code === '42P01') {
    return res.status(503).json({ erro: 'O cadastro de produtos depende da atualização do banco.' });
  }
  if (erro.original?.code === '23503') {
    return res.status(409).json({ erro: 'Confira a categoria e os vínculos do produto.' });
  }
  console.error('Falha no painel de produtos:', erro.name);
  return res.status(500).json({ erro: 'Não foi possível concluir a operação com o produto.' });
}

produtos.post('/', lerProduto, async (req, res) => {
  try {
    const dados = validarProduto(req.body, false);
    if (!dados) return res.status(400).json({ erro: 'Confira os campos do produto.' });
    const [[criado]] = await consulta(`
      insert into public.produto (nome_produto, descricao_produto, preco, estoque,
        fk_categoria_id_categoria, ativo, foto, foto_tipo, chave_criacao)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid)
      on conflict (chave_criacao) do nothing
      returning id_produto
    `, [...dados.campos, dados.chave]);
    if (criado) return res.status(201).json(criado);
    const [[existente]] = await consulta(
      'select id_produto from public.produto where chave_criacao = $1::uuid', [dados.chave]
    );
    if (!existente) return res.status(409).json({ erro: 'Reabra o formulário para cadastrar o produto.' });
    res.json(existente);
  } catch (erro) {
    falha(res, erro);
  }
});

produtos.put('/:id', lerProduto, async (req, res) => {
  try {
    const dados = validarProduto(req.body, true);
    if (!dados) return res.status(400).json({ erro: 'Confira os campos do produto.' });
    const [[salvo]] = await consulta(`
      update public.produto
      set nome_produto = $1, descricao_produto = $2, preco = $3, estoque = $4,
          fk_categoria_id_categoria = $5, ativo = $6,
          foto = case when $9 then null else coalesce($7::bytea, foto) end,
          foto_tipo = case when $9 then null else coalesce($8::text, foto_tipo) end,
          imagem_url = case when $9 then null else imagem_url end,
          imagem_detalhe_url = case when $9 then null else imagem_detalhe_url end
      where id_produto = $10 and versao = $11
      returning id_produto
    `, [...dados.campos, dados.remover, req.idProduto, dados.versao]);
    if (!salvo) return res.status(409).json({ erro: 'O produto mudou. Atualize a lista antes de salvar.' });
    res.json(salvo);
  } catch (erro) {
    falha(res, erro);
  }
});

produtos.delete('/:id', json({ limit: '1kb' }), async (req, res) => {
  const { confirmar, versao } = req.body ?? {};
  if (confirmar !== true || !inteiro(versao)) {
    return res.status(400).json({ erro: 'Confirme a exclusão definitiva do produto.' });
  }
  try {
    const [[removido]] = await consulta(`
      delete from public.produto where id_produto = $1 and versao = $2 returning id_produto
    `, [req.idProduto, versao]);
    if (!removido) {
      const [[existe]] = await consulta('select 1 from public.produto where id_produto = $1', [req.idProduto]);
      if (existe) return res.status(409).json({ erro: 'O produto mudou. Atualize a lista antes de excluir.' });
    }
    res.status(204).end();
  } catch (erro) {
    falha(res, erro);
  }
});

module.exports = produtos;
