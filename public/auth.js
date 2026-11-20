(() => {
  const api = '/api/auth';
  const formatoNumero = new Intl.NumberFormat('pt-BR');

  async function solicitar(rota, dados) {
    const opcoes = dados === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    };
    const resposta = await fetch(api + rota, opcoes);
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      const erro = new Error(corpo?.erro || 'Não foi possível concluir a solicitação.');
      erro.status = resposta.status;
      throw erro;
    }
    return resposta;
  }

  const formulario = document.querySelector('form[data-auth]');
  if (formulario) {
    const botao = formulario.querySelector('button[type="submit"]');
    const mensagem = formulario.querySelector('[data-auth-erro]');
    const cadastro = formulario.dataset.auth === 'cadastro';

    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      mensagem.textContent = '';
      const dados = new FormData(formulario);
      const senha = dados.get('senha');
      if (cadastro && senha !== dados.get('confirmar')) {
        mensagem.textContent = 'As senhas não conferem.';
        formulario.elements.confirmar.focus();
        return;
      }

      const credenciais = { email: dados.get('email'), senha };
      const envio = cadastro
        ? { ...credenciais, nome: dados.get('nome'), termos: dados.has('termos') }
        : { ...credenciais, manter: dados.has('manter') };

      botao.disabled = true;
      try {
        await solicitar(cadastro ? '/cadastro' : '/login', envio);
        location.assign('perfil.html');
      } catch (erro) {
        mensagem.textContent = erro.status ? erro.message : 'Não foi possível conectar à API.';
      } finally {
        botao.disabled = false;
      }
    });
  }

  const perfil = document.querySelector('[data-perfil]');
  if (perfil) {
    const status = document.querySelector('[data-perfil-status]');
    const saida = perfil.querySelector('[data-logout]');

    async function carregarPerfil() {
      try {
        const resposta = await solicitar('/perfil');
        const usuario = await resposta.json();
        perfil.querySelector('[data-nome]').textContent = usuario.nome;
        perfil.querySelector('[data-email]').textContent = usuario.email;
        perfil.querySelector('[data-saudacao]').textContent = usuario.nome.split(/\s+/)[0];
        perfil.querySelector('[data-pontos]').textContent = formatoNumero.format(usuario.pontos);
        perfil.querySelector('[data-xp]').textContent = formatoNumero.format(usuario.xp) + ' XP';
        perfil.hidden = false;
        status.textContent = '';
      } catch (erro) {
        if (erro.status === 401) {
          location.replace('login.html');
          return;
        }
        status.textContent = 'Não foi possível carregar seu perfil. Recarregue a página para tentar novamente.';
      }
    }

    saida.addEventListener('click', async (evento) => {
      evento.preventDefault();
      if (saida.getAttribute('aria-disabled') === 'true') return;
      saida.setAttribute('aria-disabled', 'true');
      status.textContent = '';
      try {
        await solicitar('/logout', {});
        location.replace('login.html');
      } catch {
        status.textContent = 'Não foi possível sair. Tente novamente.';
      } finally {
        saida.removeAttribute('aria-disabled');
      }
    });

    carregarPerfil();
  }
})();
