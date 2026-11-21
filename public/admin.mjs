import { obterAuth } from './sessao.mjs';
import { arquivoCapaValido, lerCapa } from './capa.mjs';

const conteudo = document.getElementById('admin-conteudo');
const retorno = document.getElementById('admin-retorno');
const recarregar = document.getElementById('admin-recarregar');
const seletor = document.getElementById('admin-colecoes');
const titulo = document.getElementById('admin-form-titulo');
const form = document.getElementById('admin-form');
const campos = form.elements;
const lista = document.getElementById('admin-produtos');
const previa = document.getElementById('admin-previa');
const capaAtual = document.getElementById('admin-capa-estado');
const removerCapa = document.getElementById('admin-remover-capa');
const mover = document.getElementById('admin-mover');
const avisoInativo = document.getElementById('admin-aviso-inativo');
const salvar = document.getElementById('admin-salvar');
const retornoForm = document.getElementById('admin-form-retorno');

let auth;
let colecoes = [];
let produtos = [];
let selecionada;
let urlPrevia;
let chaveCriacao;

function informar(elemento, mensagem, erro = false) {
  elemento.textContent = mensagem;
  elemento.classList.toggle('erro', erro);
  elemento.hidden = !mensagem;
}

async function consultar(caminho, opcoes = {}) {
  auth ||= await obterAuth();
  const { data, error } = await auth.getSession();
  if (error) throw new Error('Não foi possível carregar sua sessão. Tente novamente.');
  if (!data.session) {
    location.replace('login.html?voltar=admin');
    throw new Error('Entre na sua conta para continuar.');
  }

  const resposta = await fetch('/api/admin' + caminho, {
    ...opcoes,
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
  });
  if (resposta.status === 401) location.replace('login.html?voltar=admin');
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível acessar o painel.');
  return dados;
}

function limparPrevia() {
  if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  urlPrevia = null;
  previa.hidden = true;
  previa.removeAttribute('src');
}

function atualizarOpcoesProdutos() {
  const marcados = [...lista.querySelectorAll('input:checked')];
  const precisaMover = marcados.some(input => input.dataset.mover === 'true');
  mover.hidden = !precisaMover;
  campos.mover.required = precisaMover;
  if (!precisaMover) campos.mover.checked = false;
  avisoInativo.hidden = campos.ativa.checked || !marcados.length;
}

function abrirEditor() {
  selecionada = colecoes.find(colecao => String(colecao.id_colecao) === seletor.value);
  chaveCriacao = selecionada ? null : crypto.randomUUID();
  form.reset();
  limparPrevia();
  informar(retornoForm, '');
  titulo.textContent = selecionada ? 'Editar coleção' : 'Nova coleção';
  campos.nome.value = selecionada?.nome_colecao ?? '';
  campos.lancamento.value = selecionada?.lancamento ?? '';
  campos.encerramento.value = selecionada?.encerramento ?? '';
  campos.limite.value = selecionada?.limite_pecas ?? '';
  campos.ativa.checked = selecionada?.ativa ?? false;
  capaAtual.hidden = !selecionada?.tem_capa;
  removerCapa.hidden = !selecionada?.tem_capa;
  if (selecionada?.tem_capa && selecionada.ativa) {
    previa.src = `/api/drops/${selecionada.id_colecao}/capa?v=${selecionada.versao}`;
    previa.hidden = false;
  }

  const nomes = new Map(colecoes.map(colecao => [colecao.id_colecao, colecao.nome_colecao]));
  const itens = produtos.map(produto => {
    const rotulo = document.createElement('label');
    rotulo.className = 'admin-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = produto.id_produto;
    input.checked = produto.id_colecao !== null && produto.id_colecao === selecionada?.id_colecao;
    input.dataset.mover = String(Boolean(produto.id_colecao && !input.checked));
    const descricao = document.createElement('span');
    descricao.textContent = produto.nome_produto + (produto.id_colecao ? ' · ' + nomes.get(produto.id_colecao) : '');
    rotulo.append(input, descricao);
    return rotulo;
  });
  lista.replaceChildren(...itens);
  if (!itens.length) lista.textContent = 'Nenhum produto cadastrado.';
  atualizarOpcoesProdutos();
}

async function carregar(id = '') {
  const dados = await consultar('/colecoes');
  colecoes = dados.colecoes;
  produtos = dados.produtos;
  seletor.replaceChildren(
    new Option('Nova coleção', ''),
    ...colecoes.map(colecao => new Option(colecao.nome_colecao + (colecao.ativa ? '' : ' · Despublicada'), colecao.id_colecao)),
  );
  seletor.value = String(id);
  abrirEditor();
  conteudo.hidden = false;
}

async function iniciar() {
  informar(retorno, 'Verificando acesso…');
  recarregar.hidden = true;
  try {
    await carregar(seletor.value);
    informar(retorno, '');
  } catch (erro) {
    informar(retorno, erro.message, true);
    recarregar.hidden = false;
  }
}

campos.capa.addEventListener('change', () => {
  limparPrevia();
  informar(retornoForm, '');
  const arquivo = campos.capa.files[0];
  if (!arquivo) return;
  if (!arquivoCapaValido(arquivo)) {
    campos.capa.value = '';
    informar(retornoForm, 'Envie uma capa PNG, JPG ou WebP com até 1 MB.', true);
    return;
  }
  campos.remover_capa.checked = false;
  urlPrevia = URL.createObjectURL(arquivo);
  previa.src = urlPrevia;
  previa.hidden = false;
});
campos.remover_capa.addEventListener('change', () => {
  if (campos.remover_capa.checked) {
    campos.capa.value = '';
    limparPrevia();
  }
});
previa.addEventListener('error', () => { previa.hidden = true; });

form.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (salvar.disabled) return;

  salvar.disabled = true;
  seletor.disabled = true;
  recarregar.hidden = true;
  informar(retornoForm, 'Salvando coleção…');
  const arquivo = campos.capa.files[0];
  const id = selecionada?.id_colecao;
  let resultado;
  try {
    const corpo = {
      nome: campos.nome.value,
      lancamento: campos.lancamento.value,
      encerramento: campos.encerramento.value || null,
      limite: campos.limite.valueAsNumber,
      ativa: campos.ativa.checked,
      produtos: [...lista.querySelectorAll('input:checked')].map(input => Number(input.value)),
      mover: campos.mover.checked,
      versao: selecionada?.versao,
      chave_criacao: chaveCriacao,
      remover_capa: campos.remover_capa.checked,
    };
    if (arquivo) corpo.capa = await lerCapa(arquivo);
    resultado = await consultar(id ? '/colecoes/' + id : '/colecoes', {
      method: id ? 'PUT' : 'POST', body: JSON.stringify(corpo),
    });
  } catch (erro) {
    informar(retornoForm, erro.message, true);
    recarregar.hidden = false;
    salvar.disabled = false;
    seletor.disabled = false;
    return;
  }

  try {
    await carregar(resultado.id_colecao);
    informar(retornoForm, 'Coleção salva.');
    salvar.disabled = false;
    seletor.disabled = false;
  } catch {
    informar(retornoForm, 'Coleção salva. Recarregue o painel para continuar.');
    recarregar.hidden = false;
  }
});
seletor.addEventListener('change', abrirEditor);
lista.addEventListener('change', atualizarOpcoesProdutos);
campos.ativa.addEventListener('change', atualizarOpcoesProdutos);
recarregar.addEventListener('click', () => location.reload());
iniciar();
