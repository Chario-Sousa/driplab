(() => {
  const painel = document.querySelector('[data-drop]');
  if (!painel) return;

  const titulo = document.querySelector('[data-drop-titulo]');
  const estado = painel.querySelector('[data-drop-estado]');
  const contagem = painel.querySelector('[data-drop-contagem]');
  const info = painel.querySelector('[data-drop-info]');
  const partes = ['d', 'h', 'm', 's'].map(id => painel.querySelector('#' + id));
  const rotulos = {
    agendado: 'O drop abre em',
    em_andamento: 'Drop em andamento',
    esgotado: 'Drop esgotado',
    encerrado: 'Drop encerrado',
  };
  let assinatura;
  let intervalo;
  let proximaAtualizacao;

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

      const atual = drops.find(drop => drop.estado === 'em_andamento')
        || drops.find(drop => drop.estado === 'agendado')
        || drops.at(-1);
      const novaAssinatura = JSON.stringify(drops.map(({ id_colecao, estado, pecas_restantes }) =>
        [id_colecao, estado, pecas_restantes]));
      if (assinatura !== undefined && assinatura !== novaAssinatura) {
        document.dispatchEvent(new Event('driplab:drops-alterados'));
      }
      assinatura = novaAssinatura;

      titulo.textContent = atual?.nome_colecao || 'Lançamentos';
      estado.textContent = atual ? rotulos[atual.estado] : 'Nenhum drop anunciado';
      if (atual?.estado === 'em_andamento') {
        const restantes = atual.pecas_restantes;
        info.textContent = restantes === 1 ? '1 peça restante no drop' : `${restantes} peças restantes no drop`;
        info.hidden = false;
      }

      proximaAtualizacao = setTimeout(carregarDrops, 60000);
      if (atual?.estado === 'agendado') iniciarContagem(atual.data_lancamento, Date.parse(agora));
      if (atual?.estado === 'em_andamento' && atual.data_encerramento) {
        estado.textContent = 'O drop encerra em';
        iniciarContagem(atual.data_encerramento, Date.parse(agora));
      }
    } catch {
      estado.textContent = 'Status dos drops indisponível';
      proximaAtualizacao = setTimeout(carregarDrops, 60000);
    }
  }

  carregarDrops();
})();
