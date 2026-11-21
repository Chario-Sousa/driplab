import { obterAuth } from './sessao.mjs';
import { arquivoCapaValido, lerCapa } from './capa.mjs';

async function sessaoAtual() {
  const auth = await obterAuth();
  const { data, error } = await auth.getSession();
  if (error) throw error;
  return data.session;
}

async function consultar(caminho, { token, metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(caminho, {
    method: metodo,
    cache: 'no-store',
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(corpo && { 'Content-Type': 'application/json' }),
    },
    ...(corpo && { body: JSON.stringify(corpo) }),
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.erro || 'Não foi possível completar a solicitação.');
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

function informar(campo, mensagem, erro = false) {
  campo.textContent = mensagem;
  campo.classList.toggle('erro', erro);
}

function criarOpcao(opcao, podeVotar, escolhida) {
  const item = document.createElement(podeVotar ? 'label' : 'div');
  item.className = 'votacao-opcao';
  item.classList.toggle('escolhida', escolhida);
  if (podeVotar) {
    const entrada = document.createElement('input');
    entrada.type = 'radio';
    entrada.name = 'opcao';
    entrada.value = opcao.id_opcao;
    entrada.required = true;
    item.append(entrada);
  }

  if (opcao.capa_url) {
    const capa = document.createElement('img');
    capa.src = opcao.capa_url;
    capa.alt = '';
    capa.addEventListener('error', () => capa.remove(), { once: true });
    item.append(capa);
  }

  const nome = document.createElement('strong');
  nome.textContent = opcao.nome + (escolhida ? ' · Seu voto' : '');
  const votos = document.createElement('small');
  votos.textContent = opcao.votos === 1 ? '1 voto' : `${opcao.votos} votos`;
  item.append(nome, votos);
  return item;
}

function iniciarVotacao(pagina) {
  const titulo = pagina.querySelector('h2');
  const estado = pagina.querySelector('[data-votacao-estado]');
  const painelOpcoes = pagina.querySelector('[data-opcoes]');
  const form = pagina.querySelector('form');
  const legenda = pagina.querySelector('legend');
  const botao = form.querySelector('[type=submit]');
  const entrar = pagina.querySelector('[data-entrar]');
  const atualizar = pagina.querySelector('[data-atualizar]');
  let atual;

  async function carregar(mensagem) {
    atualizar.hidden = true;
    if (!mensagem) informar(estado, 'Carregando votação…');
    try {
      const dados = await consultar('/api/votacoes');
      atual = dados.votacao;
      titulo.textContent = atual?.titulo || 'Votação';
      form.hidden = !atual;
      entrar.hidden = true;
      botao.hidden = true;
      if (!atual) {
        informar(estado, 'Nenhuma votação publicada ainda.');
        return;
      }

      legenda.textContent = 'Resultados';
      painelOpcoes.replaceChildren(...atual.opcoes.map(opcao => criarOpcao(opcao, false, false)));
      informar(estado, mensagem || (atual.encerrada_em ? 'Votação encerrada.' : 'Votação aberta.'));
      try {
        const sessao = await sessaoAtual();
        const token = sessao?.access_token;
        const voto = token
          ? await consultar('/api/votacoes/' + atual.id_votacao + '/meu-voto', { token })
          : null;
        const podeVotar = Boolean(token && !atual.encerrada_em && !voto?.id_opcao);
        legenda.textContent = podeVotar ? 'Escolha uma opção' : 'Resultados';
        painelOpcoes.replaceChildren(...atual.opcoes.map(opcao => criarOpcao(
          opcao, podeVotar, opcao.id_opcao === voto?.id_opcao,
        )));
        entrar.hidden = Boolean(token || atual.encerrada_em);
        botao.hidden = !podeVotar;
      } catch (erro) {
        entrar.hidden = Boolean(atual.encerrada_em);
        if (erro.status !== 401) {
          informar(estado, mensagem || 'Resultados carregados. Atualize para consultar sua sessão.', !mensagem);
          atualizar.hidden = false;
        }
      }
    } catch (erro) {
      informar(estado, mensagem ? mensagem + ' Atualize para conferir a contagem.' : erro.message, !mensagem);
      atualizar.hidden = false;
    }
  }

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const opcao = new FormData(form).get('opcao');
    if (!atual || !opcao || botao.disabled) return;
    botao.disabled = true;
    try {
      const sessao = await sessaoAtual();
      if (!sessao) {
        location.href = entrar.href;
        return;
      }
      await consultar('/api/votacoes/' + atual.id_votacao + '/meu-voto', {
        token: sessao.access_token, metodo: 'POST', corpo: { id_opcao: Number(opcao) },
      });
      await carregar('Voto registrado.');
    } catch (erro) {
      if (erro.status === 401) location.href = entrar.href;
      else if (erro.status === 409) await carregar(erro.message);
      else {
        informar(estado, erro.message, true);
        atualizar.hidden = false;
      }
    } finally {
      botao.disabled = false;
    }
  });
  atualizar.addEventListener('click', () => carregar());
  carregar();
}

function iniciarPainel(pagina) {
  const estado = pagina.querySelector('[data-votacao-estado]');
  const conteudo = pagina.querySelector('[data-conteudo]');
  const atualTexto = pagina.querySelector('[data-votacao-atual]');
  const atualizar = pagina.querySelector('[data-atualizar]');
  const encerrar = pagina.querySelector('[data-encerrar]');
  const capas = pagina.querySelector('[data-capas]');
  const gradeCapas = pagina.querySelector('[data-capas-grade]');
  const form = pagina.querySelector('form');
  const abrir = form.querySelector('[type=submit]');
  let atual;
  let chave = crypto.randomUUID();
  let ocupado = false;

  async function admin(caminho, opcoes) {
    const sessao = await sessaoAtual();
    if (!sessao) {
      location.replace('login.html?voltar=admin-votacoes');
      throw new Error('Entre na sua conta para continuar.');
    }
    try {
      return await consultar('/api/admin' + caminho, { ...opcoes, token: sessao.access_token });
    } catch (erro) {
      if (erro.status === 401) location.replace('login.html?voltar=admin-votacoes');
      throw erro;
    }
  }

  async function carregar() {
    const dados = await consultar('/api/votacoes');
    atual = dados.votacao;
    const aberta = Boolean(atual && !atual.encerrada_em);
    atualTexto.textContent = atual
      ? atual.titulo + (aberta ? ' · Aberta' : ' · Encerrada')
      : 'Nenhuma votação publicada.';
    encerrar.hidden = !aberta;
    form.hidden = aberta;
    capas.hidden = !atual;
    gradeCapas.replaceChildren(...(atual?.opcoes ?? []).map(opcao => editarCapa(atual.id_votacao, opcao)));
    conteudo.hidden = false;
  }

  function editarCapa(id, opcao) {
    const editor = document.createElement('form');
    editor.className = 'admin-capa-opcao';
    const titulo = document.createElement('h3');
    titulo.textContent = opcao.nome;
    const previa = document.createElement('img');
    previa.alt = 'Capa de ' + opcao.nome;
    previa.hidden = !opcao.capa_url;
    if (opcao.capa_url) previa.src = opcao.capa_url;

    const rotulo = document.createElement('label');
    const arquivo = document.createElement('input');
    arquivo.type = 'file';
    arquivo.accept = 'image/png,image/jpeg,image/webp';
    arquivo.required = true;
    rotulo.append('Capa de ' + opcao.nome, arquivo);
    const salvar = document.createElement('button');
    salvar.className = 'btn sm';
    salvar.type = 'submit';
    salvar.textContent = 'Salvar capa';
    const retorno = document.createElement('p');
    retorno.className = 'admin-retorno';
    retorno.setAttribute('role', 'status');
    retorno.hidden = true;

    editor.append(titulo, previa, rotulo, salvar, retorno);
    editor.addEventListener('submit', async evento => {
      evento.preventDefault();
      if (salvar.disabled) return;
      retorno.hidden = false;
      const selecionada = arquivo.files[0];
      if (!selecionada || !arquivoCapaValido(selecionada)) {
        informar(retorno, 'Envie uma capa PNG, JPG ou WebP com até 1 MB.', true);
        return;
      }

      salvar.disabled = true;
      informar(retorno, 'Salvando capa…');
      const caminho = `/votacoes/${id}/opcoes/${opcao.id_opcao}/capa`;
      try {
        await admin(caminho, { metodo: 'PUT', corpo: { capa: await lerCapa(selecionada) } });
        previa.src = '/api' + caminho + '?v=' + Date.now();
        previa.hidden = false;
        arquivo.value = '';
        informar(retorno, 'Capa salva.');
      } catch (erro) {
        informar(retorno, erro.message, true);
      } finally {
        salvar.disabled = false;
      }
    });
    return editor;
  }

  async function executar(operacao) {
    if (ocupado) return;
    ocupado = true;
    abrir.disabled = true;
    encerrar.disabled = true;
    atualizar.hidden = true;
    informar(estado, 'Carregando…');
    try {
      informar(estado, await operacao());
    } catch (erro) {
      if (erro.status === 403) conteudo.hidden = true;
      informar(estado, erro.message, true);
      atualizar.hidden = false;
    } finally {
      ocupado = false;
      abrir.disabled = false;
      encerrar.disabled = false;
    }
  }

  async function iniciar() {
    await admin('/acesso');
    await carregar();
    return '';
  }

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    executar(async () => {
      const dados = new FormData(form);
      await admin('/votacoes', {
        metodo: 'POST',
        corpo: {
          id_votacao: chave,
          titulo: dados.get('titulo'),
          opcoes: dados.getAll('opcao').map(opcao => opcao.trim()).filter(Boolean),
        },
      });
      form.reset();
      chave = crypto.randomUUID();
      await carregar();
      return 'Votação publicada.';
    });
  });
  encerrar.addEventListener('click', () => {
    if (!atual) return;
    executar(async () => {
      await admin('/votacoes/' + atual.id_votacao + '/encerramento', { metodo: 'PUT' });
      await carregar();
      return 'Votação encerrada.';
    });
  });
  atualizar.addEventListener('click', () => executar(iniciar));
  executar(iniciar);
}

const publico = document.querySelector('[data-votacao]');
if (publico) iniciarVotacao(publico);
else iniciarPainel(document.querySelector('[data-admin-votacoes]'));
