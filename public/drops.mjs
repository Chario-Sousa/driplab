import { capaColecao } from './capas-colecoes.mjs';

(() => {
  const painel = document.querySelector('[data-drop]');
  if (!painel) return;

  const titulo = painel.querySelector('[data-drop-titulo]');
  const resumo = painel.querySelector('[data-drop-resumo]');
  const chamada = painel.querySelector('[data-drop-chamada]');
  const link = painel.querySelector('[data-drop-link]');
  const estado = painel.querySelector('[data-drop-estado]');
  const contagem = painel.querySelector('[data-drop-contagem]');
  const info = painel.querySelector('[data-drop-info]');
  const partes = ['d', 'h', 'm', 's'].map(id => painel.querySelector('#' + id));
  const recentes = document.querySelector('[data-drops-recentes]');
  const lista = recentes.querySelector('[data-drops-lista]');
  const periodoRecente = 30 * 24 * 60 * 60 * 1000;
  const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });
  const rotulos = {
    agendado: 'O drop abre em',
    em_andamento: 'Drop em andamento',
    esgotado: 'Drop esgotado',
    encerrado: 'Drop encerrado',
  };
  let assinatura;
  let assinaturaRecentes;
  let intervalo;
  let proximaAtualizacao;

  const linkDrop = drop => 'shop.html?' + new URLSearchParams({ colecao: drop.id_colecao });

  function criarCard(drop) {
    const item = document.createElement('li');
    const acesso = document.createElement('a');
    acesso.href = linkDrop(drop);
    const imagem = capaColecao(drop.nome_colecao, drop.capa_url);
    if (imagem) {
      const capa = document.createElement('img');
      capa.src = imagem;
      capa.alt = '';
      capa.loading = 'lazy';
      capa.addEventListener('error', () => capa.remove(), { once: true });
      acesso.append(capa);
    }
    const nome = document.createElement('strong');
    nome.textContent = drop.nome_colecao;
    const detalhe = document.createElement('small');
    detalhe.textContent = formatoData.format(new Date(drop.data_lancamento)) + ' · ' + rotulos[drop.estado];
    acesso.append(nome, detalhe);
    item.append(acesso);
    return item;
  }

  function mostrarRecentes(drops, agora, destaque) {
    const lancamentos = drops.filter(drop => {
      const idade = agora - Date.parse(drop.data_lancamento);
      return drop.id_colecao !== destaque?.id_colecao && idade >= 0 && idade <= periodoRecente
        && drop.estado !== 'agendado' && Object.hasOwn(rotulos, drop.estado);
    }).reverse().slice(0, 3);
    const novaAssinatura = JSON.stringify(lancamentos);
    if (novaAssinatura !== assinaturaRecentes) {
      lista.replaceChildren(...lancamentos.map(criarCard));
      assinaturaRecentes = novaAssinatura;
    }
    recentes.hidden = !lancamentos.length;
  }

  function iniciarContagem(alvo, horarioServidor) {
    const inicio = performance.now();
    const momento = Date.parse(alvo);
    if (!Number.isFinite(momento) || !Number.isFinite(horarioServidor)) return;

    contagem.hidden = false;
    const atualizar = () => {
      const segundos = Math.max(0, Math.ceil((momento - horarioServidor - (performance.now() - inicio)) / 1000));
      const valores = [Math.floor(segundos / 86400), Math.floor(segundos / 3600) % 24,
        Math.floor(segundos / 60) % 60, segundos % 60];
      partes.forEach((parte, indice) => parte.textContent = String(valores[indice]).padStart(2, '0'));
      if (!segundos) {
        clearInterval(intervalo);
        clearTimeout(proximaAtualizacao);
        proximaAtualizacao = setTimeout(carregarDrops, 500);
      }
    };
    intervalo = setInterval(atualizar, 1000);
    atualizar();
  }

  async function carregarDrops() {
    clearInterval(intervalo);
    clearTimeout(proximaAtualizacao);
    contagem.hidden = true;
    info.hidden = true;

    try {
      const resposta = await fetch('/api/drops', { cache: 'no-store' });
      if (!resposta.ok) throw new Error('Drops indisponíveis');
      const { agora, drops } = await resposta.json();

      const horario = Date.parse(agora);
      const atual = drops.find(drop => drop.estado === 'agendado')
        || drops.findLast(drop => drop.estado === 'em_andamento');
      const novaAssinatura = JSON.stringify(drops.map(({ id_colecao, estado, pecas_restantes }) =>
        [id_colecao, estado, pecas_restantes]));
      if (assinatura !== undefined && assinatura !== novaAssinatura) {
        document.dispatchEvent(new Event('driplab:drops-alterados'));
      }
      assinatura = novaAssinatura;

      resumo.hidden = !atual;
      if (atual) {
        titulo.textContent = atual.nome_colecao;
        chamada.textContent = atual.estado === 'agendado' ? 'Próximo drop' : 'Drop em destaque';
        link.href = linkDrop(atual);
      }
      estado.textContent = atual ? rotulos[atual.estado] : 'Nenhum drop agendado no momento.';
      mostrarRecentes(drops, horario, atual);
      if (atual?.estado === 'em_andamento') {
        const restantes = atual.pecas_restantes;
        info.textContent = restantes === 1 ? '1 peça restante no drop' : `${restantes} peças restantes no drop`;
        info.hidden = false;
      }

      proximaAtualizacao = setTimeout(carregarDrops, 60000);
      if (atual?.estado === 'agendado') iniciarContagem(atual.data_lancamento, horario);
      if (atual?.estado === 'em_andamento' && atual.data_encerramento) {
        estado.textContent = 'O drop encerra em';
        iniciarContagem(atual.data_encerramento, horario);
      }
    } catch {
      estado.textContent = 'Status dos drops indisponível';
      proximaAtualizacao = setTimeout(carregarDrops, 60000);
    }
  }

  carregarDrops();
})();
