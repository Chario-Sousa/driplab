import { obterAuth } from './sessao.mjs';

const botoes = () => document.querySelectorAll('[data-favorito]');
const listas = document.querySelectorAll('[data-favoritos-lista]');
const status = document.querySelectorAll('[data-favoritos-status]');
const avisos = document.querySelectorAll('[data-favoritos-aviso]');
const tentar = document.querySelectorAll('[data-favoritos-tentar]');
const linkPerfil = document.querySelector('[data-favoritos-perfil]');
const linkLogin = document.querySelector('[data-favoritos-login]');
const itens = new Map();
const pendentes = new Set();
let estado = 'carregando';
let usuario;
let auth;
let revisao = 0;

function atualizarBotoes() {
  botoes().forEach(botao => {
    const id = Number(botao.dataset.favorito);
    const salvo = itens.has(id);
    const remover = botao.hasAttribute('data-favorito-remover');
    botao.disabled = !id || estado === 'carregando' || pendentes.has(id);
    if (remover) return;

    botao.setAttribute('aria-pressed', String(salvo));
    botao.title = salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos';
  });
}

function criarItem(produto) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = 'produto.html?id=' + produto.id_produto;
  const miniatura = document.createElement('span');
  miniatura.className = 'favorito-miniatura';
  if (produto.imagem_url) {
    const foto = document.createElement('img');
    foto.src = produto.imagem_url;
    foto.alt = '';
    foto.loading = 'lazy';
    miniatura.append(foto);
  }
  const nome = document.createElement('span');
  nome.textContent = produto.nome_produto;
  link.append(miniatura, nome);

  const remover = document.createElement('button');
  remover.className = 'circle';
  remover.type = 'button';
  remover.dataset.favorito = produto.id_produto;
  remover.dataset.favoritoRemover = '';
  remover.setAttribute('aria-label', 'Remover ' + produto.nome_produto + ' dos favoritos');
  remover.innerHTML = window.dlIcone('trash');
  item.append(link, remover);
  return item;
}

function renderizar() {
  const mensagens = {
    carregando: 'Carregando favoritos…',
    login: 'Entre na sua conta para ver seus favoritos.',
    erro: 'Não foi possível carregar seus favoritos.',
    pronto: itens.size ? '' : 'Você ainda não tem produtos favoritos.',
  };

  status.forEach(campo => { campo.textContent = mensagens[estado]; });
  tentar.forEach(botao => { botao.hidden = estado !== 'erro'; });
  linkPerfil.hidden = estado !== 'pronto';
  linkLogin.hidden = estado !== 'login';
  listas.forEach(lista => {
    lista.replaceChildren(...[...itens.values()].map(criarItem));
  });
  atualizarBotoes();
}

function informar(painel, mensagem) {
  const campo = painel?.querySelector('[data-favoritos-status], [data-favoritos-aviso]');
  if (campo) {
    campo.textContent = mensagem;
    campo.hidden = false;
  }
}

async function obterSessao() {
  const { data, error } = await auth.getSession();
  if (error) throw error;
  return data.session;
}

async function consultar(token, caminho = '', metodo = 'GET') {
  const resposta = await fetch('/api/favoritos' + caminho, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
  });
  if (resposta.status === 401) return null;
  if (!resposta.ok) throw new Error('Não foi possível consultar favoritos.');
  return resposta.status === 204 ? true : resposta.json();
}

async function carregar() {
  const atual = ++revisao;
  estado = 'carregando';
  itens.clear();
  pendentes.clear();
  avisos.forEach(campo => { campo.hidden = true; campo.textContent = ''; });
  renderizar();

  try {
    if (!auth) {
      auth = await obterAuth();
      auth.onAuthStateChange((evento, sessao) => {
        if (evento !== 'INITIAL_SESSION' && (sessao?.user?.id ?? null) !== usuario) {
          setTimeout(carregar, 0);
        }
      });
    }
    const sessao = await obterSessao();
    if (atual !== revisao) return;
    usuario = sessao?.user?.id ?? null;
    const produtos = usuario ? await consultar(sessao.access_token) : null;
    if (atual !== revisao) return;
    produtos?.forEach(produto => itens.set(produto.id_produto, produto));
    estado = produtos ? 'pronto' : 'login';
  } catch {
    if (atual !== revisao) return;
    estado = 'erro';
  }
  renderizar();
}

async function alternar(botao) {
  const id = Number(botao.dataset.favorito);
  if (!id || pendentes.has(id) || estado === 'carregando') return;
  const painel = botao.closest('.favoritos-painel, #favoritos, [data-shop], [data-produto]');
  const lista = botao.closest('[data-favoritos-lista]');
  if (estado === 'erro') {
    await carregar();
    informar(painel, estado === 'pronto' ? 'Favoritos carregados.' : 'Confira sua sessão e tente novamente.');
    return;
  }
  if (estado === 'login') {
    location.href = 'login.html?voltar=favoritos';
    return;
  }

  const atual = revisao;
  const dono = usuario;
  const removendo = itens.has(id);
  pendentes.add(id);
  atualizarBotoes();

  try {
    const sessao = await obterSessao();
    if (atual !== revisao) return;
    if (sessao?.user?.id !== dono) {
      await carregar();
      return;
    }
    const produto = await consultar(sessao.access_token, '/' + id, removendo ? 'DELETE' : 'PUT');
    if (atual !== revisao) return;
    if (!produto) {
      location.href = 'login.html?voltar=favoritos';
      return;
    }
    if (removendo) itens.delete(id);
    else itens.set(id, produto);
    renderizar();
    informar(painel, removendo ? 'Produto removido dos favoritos.' : 'Produto salvo nos favoritos.');
    lista?.querySelector('a')?.focus();
  } catch {
    if (atual === revisao) informar(painel, 'Não foi possível atualizar os favoritos. Tente novamente.');
  } finally {
    if (atual === revisao) {
      pendentes.delete(id);
      atualizarBotoes();
    }
  }
}

document.addEventListener('driplab:catalogo-renderizado', atualizarBotoes);
document.addEventListener('click', evento => {
  const botao = evento.target.closest('[data-favorito]');
  if (botao && !botao.disabled) alternar(botao);
});
tentar.forEach(botao => botao.addEventListener('click', carregar));
carregar();
