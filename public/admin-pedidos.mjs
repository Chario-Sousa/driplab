import { obterAuth } from './sessao.mjs';

const estado = document.querySelector('[data-pedidos-estado]');
const login = document.querySelector('[data-pedidos-login]');
const atualizar = document.querySelector('[data-pedidos-atualizar]');
const painel = document.querySelector('.admin-pedidos');
const lista = document.querySelector('[data-pedidos-lista]');
const vazio = document.querySelector('[data-pedidos-vazio]');
const carregarMais = document.querySelector('[data-pedidos-mais]');
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataPedido = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
});
let proximo = null;
let ocupado = false;

function informar(mensagem, erro = false) {
  estado.textContent = mensagem;
  estado.classList.toggle('erro', erro);
}

async function consultar(caminho = '', method = 'GET') {
  const auth = await obterAuth();
  const { data } = await auth.getSession();
  if (!data?.session) {
    login.hidden = false;
    throw new Error('Entre com sua conta administrativa.');
  }
  const resposta = await fetch('/api/admin/pedidos' + caminho, {
    method, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + data.session.access_token },
  });
  if (resposta.status === 204) return;
  const corpo = await resposta.json().catch(() => ({}));
  if (resposta.status === 401) login.hidden = false;
  if (!resposta.ok) throw new Error(corpo.erro || 'Não foi possível acessar os pedidos.');
  return corpo;
}

function atualizarLista() {
  vazio.hidden = lista.childElementCount > 0 || Boolean(proximo);
  carregarMais.hidden = !proximo;
}

function criarLinha(pedido) {
  const item = document.createElement('li');
  const dados = document.createElement('div');
  const titulo = document.createElement('strong');
  titulo.textContent = 'Pedido #' + pedido.id_pedido;
  const cliente = document.createElement('small');
  cliente.textContent = pedido.email || 'Cliente sem e-mail cadastrado';
  const detalhes = document.createElement('small');
  detalhes.textContent = dataPedido.format(new Date(pedido.data_pedido)) + ' · ' + moeda.format(Number(pedido.valor_total));
  dados.append(titulo, cliente, detalhes);
  const confirmar = document.createElement('button');
  confirmar.type = 'button';
  confirmar.className = 'btn sm';
  confirmar.textContent = 'Confirmar pedido';
  confirmar.setAttribute('aria-label', 'Confirmar pedido #' + pedido.id_pedido);
  confirmar.addEventListener('click', () => confirmarPedido(pedido.id_pedido, item, confirmar));
  item.append(dados, confirmar);
  return item;
}

async function carregar(mais = false) {
  if (ocupado) return;
  ocupado = true;
  informar('Carregando pedidos…');
  try {
    const caminho = mais ? '?' + new URLSearchParams({ antes: proximo }) : '';
    const dados = await consultar(caminho);
    const linhas = dados.itens.map(criarLinha);
    if (mais) lista.append(...linhas);
    else lista.replaceChildren(...linhas);
    proximo = dados.proximo;
    painel.hidden = false;
    atualizarLista();
    informar('');
  } catch (erro) {
    informar(erro.message, true);
  } finally {
    atualizar.hidden = false;
    ocupado = false;
  }
}

async function confirmarPedido(id, item, botao) {
  if (ocupado || !window.confirm('Confirmar o pedido #' + id + '?')) return;
  ocupado = true;
  botao.disabled = true;
  informar('Confirmando pedido…');
  try {
    await consultar('/' + id + '/confirmacao', 'PUT');
    item.remove();
    atualizarLista();
    informar('Pedido #' + id + ' confirmado.');
    (lista.querySelector('button') || (proximo ? carregarMais : atualizar)).focus();
  } catch (erro) {
    informar(erro.message, true);
    botao.disabled = false;
  } finally {
    ocupado = false;
  }
}

atualizar.addEventListener('click', () => carregar());
carregarMais.addEventListener('click', () => carregar(true));
carregar();
