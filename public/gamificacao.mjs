import { obterAuth } from './sessao.mjs';

const perfil = document.querySelector('[data-perfil]');
const campo = nome => perfil.querySelector(`[data-${nome}]`);
const estados = perfil.querySelectorAll('[data-gamificacao-status]');
const botoesRecarregar = perfil.querySelectorAll('[data-gamificacao-recarregar]');
const listasConquistas = perfil.querySelectorAll('[data-conquistas-perfil]');
const retornoResgate = campo('resgate-status');
const retornoTitulo = campo('titulo-status');
const retornoTitulos = campo('titulos-status');
const recompensas = campo('recompensas-perfil');
const formatoPontos = new Intl.NumberFormat('pt-BR');
let atualizando = false;

async function consultar(caminho = '', corpo) {
  const auth = await obterAuth();
  const { data, error } = await auth.getSession();
  if (error || !data.session) throw new Error('Entre na sua conta para ver seu progresso.');

  const resposta = await fetch('/api/gamificacao' + caminho, {
    method: corpo ? 'PUT' : 'GET',
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + data.session.access_token,
      ...(corpo && { 'Content-Type': 'application/json' }),
    },
    body: corpo && JSON.stringify(corpo),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível carregar seu progresso.');
  return dados;
}

function criarItem(registro, legenda, descricao = registro.descricao) {
  const item = document.createElement('li');
  const titulo = document.createElement('strong');
  titulo.textContent = registro.titulo;
  item.append(titulo);
  if (descricao) {
    const detalhe = document.createElement('small');
    detalhe.textContent = descricao;
    item.append(detalhe);
  }
  const situacao = document.createElement('small');
  situacao.textContent = legenda;
  item.append(situacao);
  return item;
}

function criarRecompensa(recompensa, saldo) {
  const porConquista = recompensa.origem_desbloqueio != null;
  const bloqueado = porConquista && !recompensa.resgatada;
  const podeResgatar = !porConquista && (!recompensa.resgatada || recompensa.usada);
  const desconto = recompensa.desconto_percentual !== null;
  const faltam = recompensa.custo - saldo;
  const ativa = recompensa.titulo_ativo;
  const disponivel = desconto && !podeResgatar;
  let legenda = porConquista ? 'Desbloqueado' : 'Resgatado';
  if (bloqueado) legenda = 'Bloqueado';
  if (podeResgatar) {
    legenda = formatoPontos.format(recompensa.custo) + ' pontos';
  }
  if (disponivel) legenda = 'Disponível no carrinho';
  if (ativa) legenda = 'Em uso no perfil';

  const item = criarItem(recompensa, legenda, porConquista ? recompensa.descricao : null);
  item.className = 'recompensa';
  item.dataset.recompensa = recompensa.codigo;
  item.tabIndex = -1;
  item.lastElementChild.className = 'recompensa-status';
  item.toggleAttribute('data-destaque', disponivel || ativa);
  if (bloqueado) return item;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'btn sm';
  if (podeResgatar) {
    botao.textContent = 'Resgatar';
    botao.disabled = faltam > 0;
    if (botao.disabled) {
      const aviso = document.createElement('small');
      aviso.textContent = faltam === 1 ? 'Falta 1 ponto' : `Faltam ${formatoPontos.format(faltam)} pontos`;
      item.append(aviso);
    }
    botao.addEventListener('click', () => executar(
      botao, '/recompensas/' + encodeURIComponent(recompensa.codigo) + '/resgate',
      { ultimo_resgate: recompensa.ultimo_resgate },
      desconto ? 'Desconto disponível no carrinho.' : 'Título resgatado. Você já pode usá-lo no perfil.',
      desconto ? retornoResgate : retornoTitulos
    ));
  } else if (desconto) {
    botao.textContent = 'Abrir carrinho';
    botao.dataset.abrirCarrinho = '';
    botao.setAttribute('aria-controls', 'g-cart');
  } else {
    botao.textContent = ativa ? 'Remover do perfil' : 'Usar título';
    botao.addEventListener('click', () => executar(
      botao, '/titulo', { codigo: ativa ? null : recompensa.codigo },
      ativa ? 'Título removido do perfil.' : 'Título atualizado no perfil.', retornoTitulos
    ));
  }
  botao.setAttribute('aria-label', botao.textContent + ' · ' + recompensa.titulo);
  item.append(botao);
  return item;
}

function renderizar(dados) {
  campo('saldo-perfil').textContent = formatoPontos.format(dados.saldo);
  campo('saldo-perfil').hidden = false;
  campo('regras-pontos').hidden = false;
  campo('nivel-perfil').textContent = 'Nível ' + dados.nivel;
  campo('barra-xp').max = dados.xp_por_nivel;
  campo('barra-xp').value = dados.progresso_xp;
  campo('xp-perfil').textContent =
    `${formatoPontos.format(dados.xp)} XP no total · ${dados.xp_por_nivel - dados.progresso_xp} XP para o próximo nível`;
  campo('progresso-perfil').hidden = false;
  campo('titulo-perfil').textContent = dados.titulo || '';
  campo('titulo-perfil').hidden = !dados.titulo;
  campo('abrir-titulos').textContent = dados.titulo ? 'Mudar título' : 'Ver títulos';
  campo('remover-titulo').hidden = !dados.titulo;
  if (dados.titulo) retornoTitulo.textContent = '';
  const desbloqueadas = dados.conquistas.filter(conquista => conquista.desbloqueada).length;
  const progresso = campo('conquistas-progresso');
  progresso.textContent = `${desbloqueadas} de ${dados.conquistas.length} conquistas desbloqueadas`;
  progresso.hidden = false;
  for (const lista of listasConquistas) {
    const mostrarTitulo = lista.closest('#conquistas');
    lista.replaceChildren(...dados.conquistas.map(conquista => {
      const item = criarItem(conquista, conquista.desbloqueada ? 'Desbloqueada' : 'A desbloquear');
      if (conquista.desbloqueada) item.firstElementChild.className = 'gamificacao-desbloqueada';
      if (mostrarTitulo && conquista.titulo_recompensa) {
        const titulo = document.createElement('small');
        titulo.textContent = (conquista.desbloqueada ? 'Título liberado · ' : 'Título · ') + conquista.titulo_recompensa;
        item.append(titulo);
      }
      return item;
    }));
  }
  const descontos = [];
  const titulos = [];
  for (const recompensa of dados.recompensas) {
    const grupo = recompensa.desconto_percentual === null ? titulos : descontos;
    grupo.push(criarRecompensa(recompensa, dados.saldo));
  }
  campo('descontos-perfil').replaceChildren(...descontos);
  campo('titulos-perfil').replaceChildren(...titulos);
  const destino = recompensas.hidden && ['#conquistas', '#recompensas', '#titulos', '#titulo-titulos'].includes(location.hash)
    ? document.getElementById(location.hash.slice(1)) : null;
  recompensas.hidden = false;
  destino?.scrollIntoView({ block: 'start' });
}

async function carregar() {
  botoesRecarregar.forEach(botao => { botao.hidden = true; });
  estados.forEach(estado => { estado.textContent = 'Carregando seu progresso…'; });
  try {
    renderizar(await consultar());
    estados.forEach(estado => { estado.textContent = ''; });
  } catch (erro) {
    estados.forEach(estado => { estado.textContent = erro.message; });
    botoesRecarregar.forEach(botao => { botao.hidden = false; });
  }
}

async function executar(botao, caminho, corpo, mensagem, retorno = retornoResgate) {
  if (atualizando) return;
  const codigo = botao.closest('[data-recompensa]')?.dataset.recompensa;
  const comFoco = document.activeElement === botao;
  atualizando = true;
  botao.disabled = true;
  retorno.classList.remove('erro');
  retorno.textContent = 'Atualizando…';
  try {
    const resposta = await consultar(caminho, corpo);
    await carregar();
    retorno.textContent = resposta.novo_resgate === false ? 'Recompensa já disponível.' : mensagem;
  } catch (erro) {
    retorno.textContent = erro.message;
    retorno.classList.add('erro');
  } finally {
    atualizando = false;
    botao.disabled = false;
    if (comFoco && document.activeElement === document.body) {
      const item = codigo && perfil.querySelector(`[data-recompensa="${CSS.escape(codigo)}"]`);
      const destino = item?.querySelector('button:enabled') || item
        || (botao.hidden ? campo('abrir-titulos') : botao);
      destino.focus({ preventScroll: true });
    }
  }
}

const removerTitulo = campo('remover-titulo');
removerTitulo.addEventListener('click', () => executar(
  removerTitulo, '/titulo', { codigo: null }, 'Título removido do perfil.', retornoTitulo
));
botoesRecarregar.forEach(botao => botao.addEventListener('click', carregar));
if (perfil.hidden) perfil.addEventListener('driplab:perfil-pronto', carregar, { once: true });
else carregar();
