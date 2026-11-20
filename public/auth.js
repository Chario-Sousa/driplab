(() => {
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

  if (!window.supabase) {
    informar('Não foi possível carregar a autenticação. Atualize a página.', true);
    return;
  }

  const { auth } = window.supabase.createClient(
    'https://djfvjwwlbpdblwsotjbs.supabase.co',
    'sb_publishable_qfXmJzme2wPQRXc2ZrLdYg_nyYyMAiW'
  );

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
        location.replace('perfil.html');
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
    } catch {
      informar('Não foi possível carregar sua conta. Atualize a página.', true);
    }
  }

  if (formulario) {
    formulario.addEventListener('submit', enviar);
    formulario.querySelector('[type="submit"]').disabled = false;
  }
  if (perfil) abrirPerfil();
})();
