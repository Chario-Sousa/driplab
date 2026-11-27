import { obterAuth } from './sessao.mjs';
import { arquivoCapaValido, lerCapa } from './capa.mjs';

const pagina = document.querySelector('[data-admin-produtos]');
const conteudo = pagina.querySelector('[data-conteudo]');
const retorno = pagina.querySelector('[data-retorno]');
const atualizar = pagina.querySelector('[data-atualizar]');
const seletor = pagina.querySelector('[data-produto]');
const form = pagina.querySelector('.admin-form');
const campos = form.elements;
const titulo = form.querySelector('h2');
const campoDados = form.querySelector('fieldset');
const colecao = form.querySelector('[data-colecao]');
const previa = form.querySelector('[data-previa]');
const removerFoto = form.querySelector('[data-remover-foto]');
const salvar = form.querySelector('[type=submit]');
const excluir = form.querySelector('[data-excluir]');
const dialogo = pagina.querySelector('[data-confirmacao]');
let lista = [];
let atual;
let ocupado = false;
let fotoRemovida = false;
let urlPrevia;
let chave = crypto.randomUUID();

async function solicitar(caminho = '', metodo = 'GET', corpo) {
  const auth = await obterAuth();
  const { data, error } = await auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) {
    location.replace('login.html?voltar=admin-produtos');
    throw new Error('Entre na sua conta para continuar.');
  }
  const resposta = await fetch('/api/admin/produtos' + caminho, {
    method: metodo,
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + token, ...(corpo && { 'Content-Type': 'application/json' }) },
    ...(corpo && { body: JSON.stringify(corpo) }),
  });
  if (resposta.status === 401) location.replace('login.html?voltar=admin-produtos');
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const erro = new Error(dados?.erro || (resposta.status === 404
      ? 'O painel de produtos depende da atualização do servidor e do banco.'
      : 'Não foi possível concluir a operação.'));
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

function atualizarPrevia() {
  if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  const arquivo = campos.foto.files[0];
  urlPrevia = arquivo ? URL.createObjectURL(arquivo) : null;
  const imagem = urlPrevia || (!fotoRemovida && atual?.imagem_url);
  if (imagem) previa.src = imagem;
  else previa.removeAttribute('src');
  previa.hidden = !imagem;
  removerFoto.hidden = !arquivo && !atual?.imagem_url;
  removerFoto.textContent = arquivo ? 'Descartar foto selecionada'
    : fotoRemovida ? 'Desfazer remoção' : 'Remover foto';
}

function abrirFormulario() {
  atual = lista.find(produto => String(produto.id_produto) === seletor.value);
  form.reset();
  campos.foto.setCustomValidity('');
  chave = crypto.randomUUID();
  fotoRemovida = false;
  titulo.textContent = atual ? 'Editar produto' : 'Novo produto';
  campos.nome.value = atual?.nome_produto ?? '';
  campos.descricao.value = atual?.descricao_produto ?? '';
  campos.preco.value = atual?.preco ?? '';
  campos.estoque.value = atual?.estoque ?? 0;
  campos.categoria.value = atual?.id_categoria ?? '';
  campos.ativo.checked = atual?.ativo ?? true;
  colecao.textContent = atual?.nome_colecao ? 'Coleção: ' + atual.nome_colecao : '';
  colecao.hidden = !atual?.nome_colecao;
  excluir.hidden = !atual;
  atualizarPrevia();
}

async function carregar(id = atual?.id_produto) {
  const { produtos, categorias } = await solicitar();
  lista = produtos;
  seletor.replaceChildren(new Option('Novo produto', ''), ...lista.map(produto => new Option(
    produto.nome_produto + (produto.ativo ? '' : ' · Inativo'), produto.id_produto
  )));
  if (lista.some(produto => produto.id_produto === id)) seletor.value = id;
  campos.categoria.replaceChildren(new Option('Escolha uma categoria', ''), ...categorias.map(categoria =>
    new Option(categoria.nome_categoria, categoria.id_categoria)
  ));
  abrirFormulario();
  conteudo.hidden = false;
}

async function executar(operacao) {
  if (ocupado) return;
  ocupado = true;
  const controles = [seletor, campoDados, salvar, excluir, atualizar];
  for (const controle of controles) controle.disabled = true;
  retorno.textContent = 'Carregando…';
  retorno.classList.remove('erro');
  atualizar.hidden = true;
  try {
    retorno.textContent = await operacao();
  } catch (erro) {
    if (erro.status === 403) conteudo.hidden = true;
    retorno.textContent = erro.message;
    retorno.classList.add('erro');
    atualizar.hidden = false;
  } finally {
    ocupado = false;
    for (const controle of controles) controle.disabled = false;
  }
}

form.addEventListener('submit', evento => {
  evento.preventDefault();
  executar(async () => {
    const produto = atual;
    const arquivo = campos.foto.files[0];
    const corpo = {
      nome: campos.nome.value, descricao: campos.descricao.value, preco: campos.preco.value.trim(),
      estoque: campos.estoque.valueAsNumber, categoria: Number(campos.categoria.value),
      ativo: campos.ativo.checked, remover_foto: fotoRemovida,
      foto: arquivo ? await lerCapa(arquivo) : null,
      ...(produto ? { versao: produto.versao } : { chave }),
    };
    const salvo = await solicitar(produto ? '/' + produto.id_produto : '', produto ? 'PUT' : 'POST', corpo);
    await carregar(salvo.id_produto);
    return produto ? 'Produto atualizado.' : 'Produto cadastrado.';
  });
});

campos.foto.addEventListener('change', () => {
  const arquivo = campos.foto.files[0];
  campos.foto.setCustomValidity(arquivo && !arquivoCapaValido(arquivo)
    ? 'Envie uma foto PNG, JPG ou WebP com até 1 MB.' : '');
  if (!campos.foto.reportValidity()) return;
  if (arquivo) fotoRemovida = false;
  atualizarPrevia();
});
removerFoto.addEventListener('click', () => {
  if (campos.foto.files.length) campos.foto.value = '';
  else fotoRemovida = !fotoRemovida;
  campos.foto.setCustomValidity('');
  atualizarPrevia();
});
excluir.addEventListener('click', () => {
  if (!atual) return;
  dialogo.querySelector('[data-confirmacao-nome]').textContent = atual.nome_produto;
  dialogo.returnValue = '';
  dialogo.showModal();
});
dialogo.addEventListener('close', () => {
  if (!atual || dialogo.returnValue !== 'excluir') return;
  executar(async () => {
    await solicitar('/' + atual.id_produto, 'DELETE', { confirmar: true, versao: atual.versao });
    await carregar(null);
    return 'Produto excluído. Os pedidos continuam no histórico.';
  });
});
seletor.addEventListener('change', abrirFormulario);
const iniciar = () => executar(async () => {
  await carregar();
  return '';
});
atualizar.addEventListener('click', iniciar);
iniciar();
