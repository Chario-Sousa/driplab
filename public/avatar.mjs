import { obterAuth } from './sessao.mjs';
import { arquivoCapaValido, lerCapa } from './capa.mjs';

export function criarAvatar(nome, url) {
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = String(nome || '').trim().split(/\s+/u).slice(0, 2)
    .map(parte => Array.from(parte)[0] || '').join('').toUpperCase() || 'DL';
  if (url && /^\/api\/perfil\/avatares\/[a-f0-9-]{36}$/i.test(url)) {
    const imagem = document.createElement('img');
    imagem.src = url;
    imagem.alt = '';
    imagem.addEventListener('error', () => imagem.remove(), { once: true });
    avatar.append(imagem);
  }
  return avatar;
}

const perfil = document.querySelector('[data-perfil]');
if (perfil) {
  const seletor = perfil.querySelector('[data-foto-arquivo]');
  const escolher = perfil.querySelector('[data-foto-escolher]');
  const remover = perfil.querySelector('[data-foto-remover]');
  const retorno = perfil.querySelector('[data-foto-status]');
  const destino = perfil.querySelector('[data-avatar-perfil]');
  function exibir(url) {
    destino.replaceChildren(criarAvatar(perfil.querySelector('[data-conta-nome]').textContent, url));
    remover.hidden = !url;
    escolher.textContent = url ? 'Trocar foto' : 'Adicionar foto';
  }

  async function consultar(metodo, corpo) {
    const auth = await obterAuth();
    const { data } = await auth.getSession();
    if (!data?.session) throw new Error('Entre novamente para alterar sua foto.');
    const resposta = await fetch('/api/perfil/avatar', {
      method: metodo, cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + data.session.access_token,
        ...(corpo && { 'Content-Type': 'application/json' }),
      },
      body: corpo && JSON.stringify(corpo),
    });
    if (resposta.status === 204) return null;
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível acessar a foto.');
    return dados.avatar_url;
  }

  async function alterar(metodo, arquivo) {
    escolher.disabled = true;
    remover.disabled = true;
    retorno.classList.remove('erro');
    retorno.textContent = '';
    try {
      const foto = arquivo && await lerCapa(arquivo);
      const url = await consultar(metodo, foto);
      exibir(url);
      if (metodo !== 'GET') retorno.textContent = url ? 'Foto atualizada.' : 'Foto removida.';
    } catch (erro) {
      retorno.classList.add('erro');
      retorno.textContent = erro.message;
    } finally {
      escolher.disabled = false;
      remover.disabled = false;
    }
  }

  escolher.addEventListener('click', () => seletor.click());
  seletor.addEventListener('change', () => {
    const foto = seletor.files[0];
    seletor.value = '';
    if (!foto) return;
    if (arquivoCapaValido(foto)) alterar('PUT', foto);
    else {
      retorno.classList.add('erro');
      retorno.textContent = 'Escolha uma foto PNG, JPG ou WebP de até 1 MB.';
    }
  });
  remover.addEventListener('click', () => alterar('DELETE'));
  function iniciar() {
    exibir(null);
    alterar('GET');
  }
  if (perfil.hidden) perfil.addEventListener('driplab:perfil-pronto', iniciar, { once: true });
  else iniciar();
}
