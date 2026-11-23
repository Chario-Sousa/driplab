import { obterAuth } from './sessao.mjs';

export function montarComentarios(destino, tipo, id) {
  const endpoint = id ? '/api/comentarios/' + tipo + '/' + encodeURIComponent(id) : '';
  if (destino.dataset.conversa === endpoint) return;
  destino.dataset.conversa = endpoint;
  destino.hidden = !endpoint;
  const atalho = tipo === 'drop' ? document.querySelector('[data-atalho-comentarios]') : null;
  if (atalho) atalho.hidden = !endpoint;
  destino.replaceChildren();
  if (!endpoint) return;

  const drop = tipo === 'drop';
  const painel = document.createElement('div');
  painel.className = 'comentarios-conteudo';
  painel.innerHTML = `
    <h3 id="comentarios-titulo">${drop ? 'Comentários do drop' : 'Comentários da votação'}</h3>
    <form data-comentario-form hidden>
      <label for="comentario-texto">Escreva um comentário</label>
      <textarea id="comentario-texto" name="texto" rows="3" maxlength="500" required
        aria-describedby="comentario-limite"></textarea>
      <small id="comentario-limite">Até 500 caracteres</small>
      <button class="btn" type="submit">Publicar comentário</button>
    </form>
    <a class="btn sm" data-comentario-login hidden>Entrar para comentar</a>
    <p class="votacao-estado" data-comentario-status role="status">Carregando comentários…</p>
    <ul class="comentarios-lista" data-comentario-lista aria-label="Comentários publicados"></ul>
    <button class="btn sm" type="button" data-comentario-mais hidden>Carregar anteriores</button>
  `;
  painel.querySelector('[data-comentario-login]').href = drop
    ? 'login.html?voltar=comentarios-drop&colecao=' + encodeURIComponent(id)
    : 'login.html?voltar=comentarios';
  destino.append(painel);
  if (location.hash === '#comentarios') {
    requestAnimationFrame(() => {
      if (destino.dataset.conversa === endpoint && !destino.hidden) destino.scrollIntoView();
    });
  }
  const form = painel.querySelector('[data-comentario-form]');
  const texto = form.elements.texto;
  const publicar = form.querySelector('button');
  const entrar = painel.querySelector('[data-comentario-login]');
  const lista = painel.querySelector('[data-comentario-lista]');
  const estado = painel.querySelector('[data-comentario-status]');
  const mais = painel.querySelector('[data-comentario-mais]');
  const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  let comentarios = [];
  let proximo = null;
  let ocupado = false;
  let reenviar = false;
  let tentativa;

  function informar(mensagem, erro = false) {
    estado.textContent = mensagem;
    estado.classList.toggle('erro', erro);
  }

  async function sessaoAtual() {
    const auth = await obterAuth();
    const { data, error } = await auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function consultar(caminho = '', { token, metodo = 'GET', corpo } = {}) {
    const resposta = await fetch(endpoint + caminho, {
      method: metodo,
      cache: 'no-store',
      headers: {
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(corpo && { 'Content-Type': 'application/json' }),
      },
      ...(corpo && { body: JSON.stringify(corpo) }),
    });
    if (resposta.status === 204) return;
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      const erro = new Error(dados.erro || 'Não foi possível acessar os comentários.');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  function atualizarFormulario(logado) {
    form.hidden = !logado;
    entrar.hidden = logado;
  }

  function criarComentario(comentario) {
    const item = document.createElement('li');
    const cabecalho = document.createElement('header');
    cabecalho.className = 'comentario-cabecalho';
    const autor = document.createElement('strong');
    autor.textContent = comentario.autor;
    const data = document.createElement('time');
    data.dateTime = comentario.publicado_em;
    data.textContent = formatoData.format(new Date(comentario.publicado_em));
    cabecalho.append(autor, data);

    const conteudo = document.createElement('p');
    conteudo.textContent = comentario.texto;
    item.append(cabecalho, conteudo);

    if (comentario.meu) {
      const apagar = document.createElement('button');
      apagar.type = 'button';
      apagar.className = 'btn sm';
      apagar.textContent = 'Apagar comentário';
      apagar.addEventListener('click', () => remover(comentario.id_comentario));
      item.append(apagar);
    }
    return item;
  }

  function renderizar() {
    lista.replaceChildren(...comentarios.map(criarComentario));
  }

  async function executar(operacao) {
    if (ocupado) return;
    ocupado = true;
    publicar.disabled = true;
    mais.disabled = true;
    try {
      await operacao();
    } catch (erro) {
      if (erro.status === 401) {
        atualizarFormulario(false);
        comentarios = comentarios.map(comentario => ({ ...comentario, meu: false }));
        renderizar();
      }
      informar(erro.message, true);
    } finally {
      ocupado = false;
      publicar.disabled = false;
      mais.disabled = false;
    }
  }

  function carregar(anteriores = false) {
    return executar(async () => {
      informar('Carregando comentários…');
      const sessao = await sessaoAtual().catch(() => null);
      let token = sessao?.access_token;
      const caminho = anteriores && proximo ? '?antes=' + proximo : '';
      let dados;

      try {
        try {
          dados = await consultar(caminho, { token });
        } catch (erro) {
          if (erro.status !== 401) throw erro;
          token = null;
          dados = await consultar(caminho);
        }
        atualizarFormulario(Boolean(token));
      } catch (erro) {
        if (erro.status === 404 && destino.dataset.conversa === endpoint) {
          destino.hidden = true;
        if (atalho) atalho.hidden = true;
          return;
        }
        reenviar = true;
        mais.textContent = 'Tentar novamente';
        mais.hidden = false;
        throw erro;
      }

      const atuais = anteriores ? comentarios : [];
      const ids = new Set(atuais.map(item => item.id_comentario));
      comentarios = atuais.concat(dados.itens.filter(item => !ids.has(item.id_comentario)));
      proximo = dados.proximo;
      reenviar = false;
      mais.textContent = 'Carregar anteriores';
      mais.hidden = !proximo;
      renderizar();
      informar(comentarios.length ? '' : 'Nenhum comentário publicado ainda.');
    });
  }

  async function sessaoParaEditar() {
    const sessao = await sessaoAtual();
    if (!sessao) {
      const erro = new Error('Entre novamente para gerenciar seus comentários.');
      erro.status = 401;
      throw erro;
    }
    return sessao;
  }

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    executar(async () => {
      const conteudo = texto.value.trim();
      if (!conteudo) {
        informar('Escreva um comentário antes de publicar.', true);
        texto.focus();
        return;
      }

      texto.readOnly = true;
      try {
        const sessao = await sessaoParaEditar();
        if (tentativa?.texto !== conteudo || tentativa?.usuario !== sessao.user.id) {
          tentativa = { texto: conteudo, usuario: sessao.user.id, chave: crypto.randomUUID() };
        }
        const novo = await consultar('', {
          token: sessao.access_token,
          metodo: 'POST',
          corpo: { texto: conteudo, chave_publicacao: tentativa.chave },
        });
        comentarios = [novo, ...comentarios.filter(item => item.id_comentario !== novo.id_comentario)];
        renderizar();
        texto.value = '';
        tentativa = undefined;
        informar('Comentário publicado.');
      } catch (erro) {
        if (erro.status === 409) tentativa = undefined;
        throw erro;
      } finally {
        texto.readOnly = false;
      }
    });
  });

  function remover(id) {
    if (ocupado || !window.confirm('Apagar este comentário?')) return;
    executar(async () => {
      const sessao = await sessaoParaEditar();
      await consultar('/' + id, { token: sessao.access_token, metodo: 'DELETE' });
      comentarios = comentarios.filter(item => item.id_comentario !== id);
      renderizar();
      informar('Comentário removido.');
      texto.focus({ preventScroll: true });
    });
  }

  mais.addEventListener('click', () => carregar(Boolean(proximo) && !reenviar));
  carregar();
}

const comentariosDrop = document.querySelector('[data-comentarios-drop]');
if (comentariosDrop) {
  const seletor = document.getElementById('filtro-colecao');
  document.addEventListener('driplab:colecao-selecionada', evento => {
    montarComentarios(comentariosDrop, 'drop', evento.detail);
  });
  montarComentarios(comentariosDrop, 'drop', seletor.value);
}
