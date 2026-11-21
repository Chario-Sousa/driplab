(() => {
  const filtro = document.getElementById('colecoes-filtro');
  const status = document.getElementById('colecoes-status');
  const grade = document.getElementById('cards');
  const tentar = document.getElementById('colecoes-tentar');
  const destaque = document.getElementById('colecoes-destaque');
  const destaqueLink = document.getElementById('colecoes-destaque-link');
  const rotulos = {
    agendado: 'Em breve',
    em_andamento: 'Em andamento',
    esgotado: 'Esgotado',
    encerrado: 'Encerrado',
  };
  const dataLancamento = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium', timeZone: 'America/Sao_Paulo',
  });
  let drops = [];

  function linkColecao(drop) {
    return 'shop.html?' + new URLSearchParams({ colecao: drop.id_colecao });
  }

  function criarCard(drop) {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = linkColecao(drop);
    card.dataset.estado = drop.estado;
    if (drop.capa_url) {
      const capa = document.createElement('img');
      capa.className = 'card-capa';
      capa.src = drop.capa_url;
      capa.alt = '';
      capa.loading = 'lazy';
      capa.addEventListener('error', () => capa.remove(), { once: true });
      card.append(capa);
    }

    const titulo = document.createElement('h3');
    titulo.textContent = drop.nome_colecao;
    const estado = document.createElement('span');
    estado.className = 'estado';
    estado.textContent = rotulos[drop.estado];
    card.append(titulo, estado);

    const data = new Date(drop.data_lancamento);
    if (drop.data_lancamento && Number.isFinite(data.getTime())) {
      const lancamento = document.createElement('time');
      lancamento.dateTime = data.toISOString();
      lancamento.textContent = 'Lançamento em ' + dataLancamento.format(data);
      card.append(lancamento);
    }

    const acao = document.createElement('span');
    acao.className = 'btn sm';
    acao.textContent = 'Ver na Shop →';
    card.append(acao);
    return card;
  }

  function renderizar() {
    const visiveis = filtro.value ? drops.filter(drop => drop.estado === filtro.value) : drops;
    if (!drops.length) status.textContent = 'Nenhuma coleção anunciada.';
    else if (!visiveis.length) status.textContent = 'Nenhuma coleção com esse status.';
    else status.textContent = visiveis.length === 1 ? '1 coleção' : `${visiveis.length} coleções`;
    grade.replaceChildren(...visiveis.map(criarCard));
  }

  async function carregar() {
    tentar.hidden = true;
    status.textContent = 'Carregando coleções…';
    try {
      const resposta = await fetch('/api/drops', { cache: 'no-store' });
      if (!resposta.ok) throw new Error('Coleções indisponíveis.');
      const dados = await resposta.json();
      drops = dados.drops.filter(drop => Object.hasOwn(rotulos, drop.estado));
      const principal = drops.find(drop => drop.estado === 'em_andamento')
        || drops.find(drop => drop.estado === 'agendado')
        || drops.at(-1);
      if (principal) {
        destaque.textContent = `${principal.nome_colecao} · ${rotulos[principal.estado]}`;
        destaqueLink.href = linkColecao(principal);
      }
      destaque.hidden = !principal;
      destaqueLink.hidden = !principal;
      filtro.disabled = !drops.length;
      renderizar();
    } catch {
      status.textContent = 'Não foi possível carregar as coleções.';
      tentar.hidden = false;
    }
  }

  for (const [estado, rotulo] of Object.entries(rotulos)) {
    filtro.add(new Option(rotulo, estado));
  }
  filtro.addEventListener('change', renderizar);
  tentar.addEventListener('click', carregar);
  carregar();
})();
