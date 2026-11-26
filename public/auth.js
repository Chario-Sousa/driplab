(async () => {
  const formulario = document.querySelector('form[data-auth]');
  const perfil = document.querySelector('[data-perfil]');
  const retorno = document.querySelector('[data-auth-retorno]');

  const mensagens = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
    email_address_not_authorized: 'O envio de e-mails ainda está limitado neste ambiente.',
    email_address_invalid: 'Informe um e-mail válido.',
    weak_password: 'A senha não atende aos requisitos de segurança.',
    over_email_send_rate_limit: 'Aguarde alguns minutos antes de solicitar outro e-mail.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  };

  function informar(mensagem, erro = false) {
    retorno.textContent = mensagem;
    retorno.classList.toggle('erro', erro);
    retorno.hidden = !mensagem;
  }

  let auth;
  try {
    const { obterAuth } = await import('./sessao.mjs');
    auth = await obterAuth();
  } catch {
    informar('Não foi possível carregar a autenticação. Atualize a página.', true);
    return;
  }

  function validar() {
    const senha = formulario.elements.senha;
    const campos = [...formulario.querySelectorAll('input[required]')];
    let primeiroErro;

    for (const campo of campos) {
      const valido = campo.validity.valid
        && (campo.type === 'password' || Boolean(campo.value.trim()))
        && (campo.name !== 'confirmar' || campo.value === senha.value);

      campo.closest('.campo').classList.toggle('erro', !valido);
      campo.setAttribute('aria-invalid', String(!valido));
      if (!valido && !primeiroErro) primeiroErro = campo;
    }

    primeiroErro?.focus();
    return !primeiroErro;
  }

  async function enviar(evento) {
    evento.preventDefault();
    const botao = formulario.querySelector('[type="submit"]');
    if (botao.disabled) return;

    informar('');
    if (!validar()) return;

    const { email, senha, nome, usuario } = formulario.elements;
    const credenciais = { email: email.value.trim(), password: senha.value };
    const cadastro = formulario.dataset.auth === 'cadastro';
    botao.disabled = true;

    try {
      const { data, error } = cadastro
        ? await auth.signUp({
          ...credenciais,
          options: {
            data: { nome: nome.value.trim(), usuario: usuario.value.trim() },
            emailRedirectTo: new URL('perfil.html', location.href).href,
          },
        })
        : await auth.signInWithPassword(credenciais);

      if (error) throw error;
      if (data.session) {
        const parametros = new URLSearchParams(location.search);
        const voltar = parametros.get('voltar');
        const colecao = parametros.get('colecao') || '';
        const destinos = new Map([
          ['carrinho', 'index.html?carrinho=1'], ['favoritos', 'shop.html'], ['admin', 'admin.html'],
          ['votacao', 'comunidade.html'], ['admin-votacoes', 'admin-votacoes.html'],
          ['comentarios', 'comunidade.html#comentarios'],
        ]);
        if (/^[1-9]\d*$/.test(colecao) && Number(colecao) <= 2147483647) {
          destinos.set('comentarios-drop', 'shop.html?colecao=' + colecao + '#comentarios');
        }
        location.replace((!cadastro && destinos.get(voltar)) || 'perfil.html');
        return;
      }

      senha.value = '';
      formulario.elements.confirmar.value = '';
      informar('Se o cadastro for elegível, você receberá um e-mail para confirmar a conta.');
    } catch (erro) {
      informar(mensagens[erro.code] ?? 'Não foi possível concluir agora. Tente novamente.', true);
    } finally {
      botao.disabled = false;
    }
  }

  async function abrirPerfil() {
    informar('Carregando sua conta…');
    const retornoConfirmacao = new URLSearchParams(location.hash.slice(1));
    if (retornoConfirmacao.has('error_code')) {
      informar('O link de confirmação é inválido ou expirou. Volte à tela de login.', true);
      document.querySelector('[data-auth-voltar]').hidden = false;
      return;
    }

    try {
      const { data, error } = await auth.getUser();

      if (error && error.name !== 'AuthSessionMissingError' && error.status !== 401) {
        throw error;
      }

      if (!data.user) {
        location.replace('login.html');
        return;
      }

      const { user } = data;
      const nome = user.user_metadata?.nome;
      const usuario = user.user_metadata?.usuario;
      perfil.querySelector('[data-conta-nome]').textContent =
        typeof nome === 'string' && nome.trim() ? nome : 'DripLab';
      perfil.querySelector('[data-conta-usuario]').textContent =
        typeof usuario === 'string' && usuario.trim() ? '@' + usuario : 'Minha conta';
      perfil.querySelector('[data-conta-email]').textContent = user.email || '';
      perfil.querySelector('[data-conta-desde]').textContent = 'Membro desde ' +
        new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
          .format(new Date(user.created_at));

      const sair = perfil.querySelector('[data-auth-sair]');
      sair.addEventListener('click', async () => {
        sair.disabled = true;
        informar('');
        try {
          const { error } = await auth.signOut({ scope: 'local' });
          if (error) throw error;
          location.replace('login.html');
        } catch {
          informar('Não foi possível sair. Tente novamente.', true);
          sair.disabled = false;
        }
      });

      auth.onAuthStateChange(evento => {
        if (evento === 'SIGNED_OUT') location.replace('login.html');
      });
      informar('');
      perfil.hidden = false;
      if (location.hash === '#pedidos') {
        const pedidos = perfil.querySelector('#pedidos');
        if (document.activeElement === document.body) pedidos.focus({ preventScroll: true });
        pedidos.scrollIntoView({ block: 'start' });
      }
      perfil.dispatchEvent(new Event('driplab:perfil-pronto'));
      carregarPedidos();
      mostrarLinkAdmin();
    } catch {
      informar('Não foi possível carregar sua conta. Atualize a página.', true);
    }
  }

  async function mostrarLinkAdmin() {
    const links = perfil.querySelectorAll('[data-admin-link]');
    if (!links.length) return;
    try {
      const { data } = await auth.getSession();
      if (!data.session) return;
      const resposta = await fetch('/api/admin/acesso', {
        headers: { Authorization: 'Bearer ' + data.session.access_token },
        cache: 'no-store',
      });
      links.forEach(link => { link.hidden = resposta.status !== 204; });
    } catch {
      links.forEach(link => { link.hidden = true; });
    }
  }

  async function carregarPedidos() {
    const lista = perfil.querySelector('[data-lista-pedidos]');
    const estado = perfil.querySelector('[data-pedidos-retorno]');
    const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataPedido = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
    const situacoes = { pendente: 'Pendente', confirmado: 'Confirmado', cancelado: 'Cancelado' };
    try {
      const { data, error } = await auth.getSession();
      if (error || !data.session) throw error || new Error('Sessão ausente');

      const resposta = await fetch('/api/pedidos', {
        headers: { Authorization: 'Bearer ' + data.session.access_token },
      });
      if (!resposta.ok) throw new Error('Falha ao consultar pedidos');

      const pedidos = await resposta.json();
      for (const pedido of pedidos) {
        const cartao = document.createElement('article');
        cartao.className = 'pedido';
        const titulo = document.createElement('b');
        titulo.textContent = 'Pedido #' + pedido.id_pedido;
        const data = document.createElement('small');
        data.textContent = dataPedido.format(new Date(pedido.data_pedido));
        const status = document.createElement('span');
        status.className = 'status prep';
        status.textContent = situacoes[pedido.status] || pedido.status;
        const itens = document.createElement('ul');
        for (const item of pedido.itens) {
          const linha = document.createElement('li');
          linha.textContent = `${item.quantidade} × ${item.nome_produto} · ${moeda.format(Number(item.preco_unitario))}`;
          itens.append(linha);
        }
        const total = document.createElement('b');
        total.textContent = 'Total do pedido ' + moeda.format(Number(pedido.valor_total));
        cartao.append(titulo, data, status, itens);
        const valorDesconto = Number(pedido.valor_desconto);
        if (valorDesconto > 0) {
          const desconto = document.createElement('small');
          desconto.textContent = 'Desconto por pontos: −' + moeda.format(valorDesconto);
          cartao.append(desconto);
        }
        cartao.append(total);
        lista.append(cartao);
      }
      estado.textContent = pedidos.length ? '' : 'Você ainda não tem pedidos.';
      estado.hidden = Boolean(pedidos.length);
    } catch {
      estado.textContent = 'Não foi possível carregar seus pedidos. Atualize a página.';
      estado.classList.add('erro');
    }
  }

  if (formulario) {
    formulario.addEventListener('submit', enviar);
    formulario.querySelector('[type="submit"]').disabled = false;
  }
  if (perfil) abrirPerfil();
})();
