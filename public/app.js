(function () {
  const moeda = n => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];


  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    star: '<path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.1.6-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="m15.5 12.9 1.5 9.1-5-3-5 3 1.5-9.1"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    crown: '<path d="m2 7 5 5 5-8 5 8 5-5-2 12H4z"/>',
    truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1"/>',
    lockopen: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    gamepad: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1L1.6 15a3 3 0 0 0 5 2.6L8 16h8l1.4 1.6a3 3 0 0 0 5-2.6l-1.2-6.9A4 4 0 0 0 17.3 5z"/>',
    shirt: '<path d="M20.4 7.2 16 3l-4 2-4-2-4.4 4.2 3 3 1.4-1V21h12V9.2l1.4 1z"/>',
    parachute: '<path d="M2 10a10 10 0 0 1 20 0H2zM7 10a5 8 0 0 1 10 0M2 10l7 8m13-8-7 8m-8-8 3 8m7-8-3 8"/><rect x="9" y="18" width="6" height="4" rx="1"/>',
    monitor: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M12 17v4m-4 0h8m-4-7V6m-3 3 3-3 3 3"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    cart: '<path d="M3 4h3l2.5 11h9L20 7H7"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    coupon: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>',
    hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V3.5a1.5 1.5 0 0 1 3 0V11M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2-3a1.5 1.5 0 0 1 2.5-1.5L8 15"/>'
  };
  const ic = (n, extra = '') => `<svg class="ico ${extra}" aria-hidden="true"><use href="#x-${n}"/></svg>`;
  window.dlIcone = ic;
  const sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    Object.entries(P).map(([k, v]) => `<symbol id="x-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('') + '</svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);

  const cabecalho = $('.header');
  const menu = cabecalho?.querySelector('.menu');
  const acoes = cabecalho?.querySelector('.actions');

  if (menu && acoes) {
    const botao = document.createElement('button');
    menu.id ||= 'menu-principal';
    botao.type = 'button';
    botao.className = 'circle menu-toggle';
    botao.setAttribute('aria-label', 'Menu principal');
    botao.setAttribute('aria-controls', menu.id);
    botao.setAttribute('aria-expanded', 'false');
    botao.innerHTML = ic('menu');
    acoes.prepend(botao);

    function alternarMenu(aberto) {
      menu.classList.toggle('menu-aberto', aberto);
      botao.setAttribute('aria-expanded', String(aberto));
    }

    botao.addEventListener('click', () => {
      const aberto = !menu.classList.contains('menu-aberto');
      alternarMenu(aberto);
      if (aberto) menu.querySelector('a')?.focus();
    });
    menu.addEventListener('click', evento => {
      if (evento.target.closest('a')) alternarMenu(false);
    });
    document.addEventListener('click', evento => {
      if (!menu.contains(evento.target) && !botao.contains(evento.target)) alternarMenu(false);
    });
    document.addEventListener('keydown', evento => {
      if (evento.key === 'Escape' && menu.classList.contains('menu-aberto')) {
        alternarMenu(false);
        botao.focus();
      }
    });
    matchMedia('(max-width: 860px)').addEventListener('change', () => alternarMenu(false));
  }

  const perfil = $('[data-perfil]');
  if (perfil) {
    const favoritos = $('#favoritos', perfil);
    const conquistas = $('#conquistas', perfil);
    const recompensas = $('#recompensas', perfil);
    const titulos = $('#titulos', perfil);
    const pontos = $('[data-pontos-perfil]', perfil);
    const resumo = $('[data-resumo-perfil]', perfil);
    const principal = $('main', perfil);
    const menuPerfil = $('.lateral nav', perfil);
    const links = {
      favoritos: $('a[href="#favoritos"]', menuPerfil),
      conquistas: $('a[href="#conquistas"]', menuPerfil),
      recompensas: $('a[href="#recompensas"]', menuPerfil),
      titulos: $('a[href="#titulos"]', menuPerfil),
      geral: $('a[href="perfil.html"]', menuPerfil),
    };

    function mostrarAbaPerfil() {
      const hash = location.hash;
      let aba = 'geral';
      if (hash === '#favoritos') aba = 'favoritos';
      if (hash === '#conquistas') aba = 'conquistas';
      if (hash === '#recompensas') aba = 'recompensas';
      if (hash === '#titulos' || hash === '#titulo-titulos') aba = 'titulos';
      perfil.dataset.aba = aba;

      const destinoFavoritos = aba === 'favoritos' ? principal : resumo;
      if (favoritos.parentElement !== destinoFavoritos) destinoFavoritos.append(favoritos);
      conquistas.hidden = aba !== 'conquistas';
      titulos.hidden = aba !== 'titulos';
      const painelComPontos = { recompensas, titulos }[aba];
      if (pontos.parentElement !== (painelComPontos || resumo)) {
        if (painelComPontos) $('.cartao-t', painelComPontos).after(pontos);
        else resumo.prepend(pontos);
      }

      for (const [nome, link] of Object.entries(links)) {
        link.classList.toggle('on', aba === nome);
        if (aba === nome) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }

    mostrarAbaPerfil();
    window.addEventListener('hashchange', () => {
      const abaAnterior = perfil.dataset.aba;
      mostrarAbaPerfil();
      const destino = document.getElementById(location.hash.slice(1));
      if (perfil.dataset.aba !== 'geral') {
        destino?.focus({ preventScroll: true });
        destino?.scrollIntoView({ block: 'start' });
      } else if (abaAnterior !== 'geral') {
        (destino || principal).scrollIntoView({ block: 'start' });
      }
    });
    menuPerfil.addEventListener('click', evento => {
      const hash = evento.target.closest('a')?.hash;
      if (hash && hash === location.hash) document.getElementById(hash.slice(1))?.focus({ preventScroll: true });
    });
  }

  $$('[data-ic]').forEach(el => { el.outerHTML = ic(el.dataset.ic, el.className); });

  const produtos = [
    { id: 'moletom-essential', nome: 'Moletom Essential', variante: 'Preto / G', preco: 349.90, img: '--img-prod-moletom-essential', info: 'Moletom / Preto' },
    { id: 'tshirt-logo', nome: 'T-Shirt Logo', variante: 'Oversized / Branco / G', preco: 159.90, img: '--img-prod-tshirt-logo', info: 'Branco / M' },
    { id: 'cargo-pants', nome: 'Cargo Pants', variante: 'Preto / G', preco: 299.90, img: '--img-prod-cargo-pants', info: 'Preto / G' },
    { id: 'bone', nome: 'Boné DripLab', variante: 'Preto / Único', preco: 129.90, img: '--img-prod-bone', info: 'Preto / Único' },
    { id: 'jaqueta-tech', nome: 'Jaqueta Tech', variante: 'Preto / G', preco: 399.90, img: '--img-prod-jaqueta-tech', info: 'Preto / G' }
  ];
  const foto = (v, cls = '') => `<div class="foto ${cls}" style="--foto:var(${v})" role="img" aria-label="Imagem do produto"></div>`;

  const chaveCarrinho = 'driplab:carrinho';
  const rascunho = lerCarrinho();
  let carrinho = rascunho.itens;
  let tentativa = rascunho.tentativa;
  let codigoDesconto = rascunho.codigoDesconto;
  let descontos = [];
  let finalizando = false;
  const textoSeguro = texto => texto.replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[caractere]);

  function lerCarrinho() {
    try {
      const dados = JSON.parse(sessionStorage.getItem(chaveCarrinho));
      const itens = Array.isArray(dados?.itens) ? dados.itens.filter(item =>
        typeof item?.id === 'string' && /^[a-z\d-]+$/i.test(item.id)
        && typeof item.nome === 'string' && typeof item.variante === 'string'
        && typeof item.img === 'string' && /^--img-prod-[a-z\d-]+$/i.test(item.img)
        && Number.isFinite(item.preco) && Number.isInteger(item.q) && item.q > 0
      ) : [];
      const codigoDesconto = typeof dados?.codigoDesconto === 'string' && /^[a-z0-9-]{1,64}$/.test(dados.codigoDesconto)
        ? dados.codigoDesconto : null;
      return { itens, tentativa: dados?.tentativa, codigoDesconto };
    } catch {
      return { itens: [] };
    }
  }

  function salvarCarrinho() {
    try {
      sessionStorage.setItem(chaveCarrinho, JSON.stringify({ itens: carrinho, tentativa, codigoDesconto }));
    } catch {
      return;
    }
  }


  document.body.insertAdjacentHTML('beforeend', `
    <div class="veu" id="veu"></div>

    <div class="busca" id="busca" role="dialog" aria-label="Buscar produtos" aria-modal="true" aria-hidden="true">
      <div class="busca-topo">
        <div class="campo busca-campo">${ic('search')}
          <input id="busca-in" type="search" aria-label="Buscar por nome ou categoria" placeholder="Buscar por nome ou categoria" autocomplete="off">
          <button type="button" id="busca-limpar" aria-label="Limpar busca">${ic('close')}</button>
        </div>
        <button class="cancelar" type="button" data-fechar>Cancelar</button>
      </div>
      <div class="busca-corpo">
        <p class="auth-retorno" id="busca-status" role="status"></p>
        <ul id="busca-res" aria-label="Resultados da busca"></ul>
        <button class="btn sm" id="busca-tentar" type="button" hidden>Tentar novamente</button>
      </div>
    </div>

    <aside class="gaveta fav" id="g-fav" aria-label="Favoritos" aria-hidden="true">
      <div class="g-topo">${ic('star')}<h2>Meus favoritos</h2><button class="circle fechar" data-fechar aria-label="Fechar">${ic('close')}</button></div>
      <div class="g-lista favoritos-painel">
        <p class="auth-retorno" role="status" data-favoritos-status>Carregando favoritos…</p>
        <ul class="favoritos-lista" data-favoritos-lista></ul>
        <button type="button" class="btn sm" data-favoritos-tentar hidden>Tentar novamente</button>
      </div>
      <a class="btn-borda" href="perfil.html#favoritos" data-favoritos-perfil data-fechar hidden>Ver no perfil ${ic('arrow')}</a>
      <a class="btn-borda" href="login.html?voltar=favoritos" data-favoritos-login hidden>Entrar na conta ${ic('arrow')}</a>
    </aside>

    <aside class="gaveta" id="g-cart" aria-label="Carrinho" aria-hidden="true">
      <div class="g-topo">${ic('cart')}<div><h2>Carrinho</h2><small id="cart-n"></small></div><button class="circle fechar" data-fechar aria-label="Fechar">${ic('close')}</button></div>
      <div class="g-lista" id="cart-lista"></div>
      <div id="cart-recompensas" class="cart-recompensas" hidden>
        <label for="cart-desconto">Desconto por pontos</label>
        <select id="cart-desconto"><option value="">Sem desconto</option></select>
        <a href="perfil.html#recompensas">Ver recompensas</a>
      </div>
      <div class="totais" id="cart-tot"></div>
      <p class="auth-retorno" id="cart-retorno" role="status" hidden></p>
      <button class="btn-cheio" id="finalizar-compra" type="button">${ic('bag')} Finalizar compra ${ic('arrow')}</button>
    </aside>`);

  const veu = $('#veu');
  const alvos = { busca: $('#busca'), fav: $('#g-fav'), cart: $('#g-cart') };
  let acionadorBusca;
  function abrir(k) {
    const jaAberto = alvos[k].classList.contains('on');
    Object.values(alvos).forEach(e => { e.classList.remove('on'); e.setAttribute('aria-hidden', 'true'); });
    alvos[k].classList.add('on'); alvos[k].setAttribute('aria-hidden', 'false'); veu.classList.add('on');
    if (k === 'busca') $('#busca-in').focus();
    if (k === 'cart' && !jaAberto) carregarDescontos();
  }
  function fechar() {
    if (alvos.busca.classList.contains('on')) acionadorBusca?.focus();
    Object.values(alvos).forEach(e => { e.classList.remove('on'); e.setAttribute('aria-hidden', 'true'); });
    veu.classList.remove('on');
  }
  veu.addEventListener('click', fechar);
  $$('[data-fechar]').forEach(b => b.addEventListener('click', fechar));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  const liga = (rotulo, fn) => $$(`.header .circle[aria-label="${rotulo}"]`).forEach(b => b.addEventListener('click', fn));
  liga('Buscar', evento => {
    acionadorBusca = evento.currentTarget;
    abrir('busca');
    carregarBusca();
  });
  liga('Perfil', () => { location.href = 'perfil.html'; });
  liga('Favoritos', () => {
    abrir('fav');
    iniciarFavoritos();
  });
  liga('Carrinho', () => abrir('cart'));
  document.addEventListener('click', evento => {
    if (evento.target.closest('[data-abrir-carrinho]')) abrir('cart');
  });

  const campoBusca = $('#busca-in');
  const listaBusca = $('#busca-res');
  const statusBusca = $('#busca-status');
  const tentarBusca = $('#busca-tentar');
  let catalogoBusca;
  let carregandoBusca = false;

  function normalizarBusca(texto) {
    return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function criarResultadoBusca(produto) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'res';
    link.href = 'produto.html?id=' + encodeURIComponent(produto.id_produto);

    const miniatura = document.createElement('span');
    miniatura.className = 'busca-foto';
    if (produto.imagem_url) {
      const imagem = document.createElement('img');
      imagem.src = produto.imagem_url;
      imagem.alt = '';
      imagem.loading = 'lazy';
      imagem.addEventListener('error', () => imagem.remove(), { once: true });
      miniatura.append(imagem);
    }

    const descricao = document.createElement('span');
    const nome = document.createElement('b');
    const categoria = document.createElement('small');
    const preco = document.createElement('b');
    nome.textContent = produto.nome_produto;
    categoria.textContent = produto.nome_categoria;
    preco.textContent = moeda(Number(produto.preco));
    descricao.append(nome, categoria);
    link.append(miniatura, descricao, preco);
    link.insertAdjacentHTML('beforeend', ic('arrow'));
    item.append(link);
    return item;
  }

  function renderBusca() {
    if (!catalogoBusca) return;
    const termos = normalizarBusca(campoBusca.value).split(' ');
    const encontrados = catalogoBusca.filter(({ busca }) => termos.every(termo => busca.includes(termo)));
    statusBusca.textContent = encontrados.length
      ? `${encontrados.length} ${encontrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`
      : 'Nenhum produto encontrado.';
    listaBusca.replaceChildren(...encontrados.map(({ produto }) => criarResultadoBusca(produto)));
  }

  async function carregarBusca() {
    if (carregandoBusca) return;
    carregandoBusca = true;
    catalogoBusca = null;
    tentarBusca.hidden = true;
    statusBusca.textContent = 'Carregando produtos…';
    listaBusca.replaceChildren();

    try {
      const resposta = await fetch('/api/produtos', { cache: 'no-store' });
      if (!resposta.ok) throw new Error('Catálogo indisponível.');
      const produtos = await resposta.json();
      catalogoBusca = produtos.map(produto => ({
        produto,
        busca: normalizarBusca(`${produto.nome_produto} ${produto.nome_categoria || ''}`),
      }));
      renderBusca();
    } catch {
      statusBusca.textContent = 'Não foi possível carregar os produtos.';
      tentarBusca.hidden = false;
    } finally {
      carregandoBusca = false;
    }
  }

  campoBusca.addEventListener('input', renderBusca);
  campoBusca.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' && !evento.isComposing) listaBusca.querySelector('a')?.focus();
  });
  $('#busca-limpar').addEventListener('click', () => {
    campoBusca.value = '';
    renderBusca();
    campoBusca.focus();
  });
  tentarBusca.addEventListener('click', () => {
    campoBusca.focus();
    carregarBusca();
  });
  alvos.busca.addEventListener('keydown', evento => {
    if (evento.key !== 'Tab') return;
    const ultimo = alvos.busca.querySelector('#busca-tentar:not([hidden])')
      || listaBusca.querySelector('li:last-child a') || alvos.busca.querySelector('[data-fechar]');

    if (evento.shiftKey && evento.target === campoBusca) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && evento.target === ultimo) {
      evento.preventDefault();
      campoBusca.focus();
    }
  });

  function iniciarFavoritos() {
    import('./favoritos.mjs').catch(() => {
      $$('[data-favoritos-status]').forEach(campo => {
        campo.textContent = 'Não foi possível abrir favoritos. Atualize a página.';
      });
    });
  }

  function mostrarRetorno(mensagem, erro = false) {
    const retorno = $('#cart-retorno');
    retorno.textContent = mensagem;
    retorno.classList.toggle('erro', erro);
    retorno.hidden = !mensagem;
  }

  function adicionarAoCarrinho(produto) {
    if (!produto || finalizando) return;

    const item = carrinho.find(atual => atual.id === produto.id);
    if (item) item.q++;
    else carrinho.push({ ...produto, q: 1 });

    mostrarRetorno('');
    renderCart();
    abrir('cart');
  }

  function atualizarDescontos() {
    const seletor = $('#cart-desconto');
    const opcoes = descontos.map(item => new Option(item.titulo, item.codigo));
    if (codigoDesconto && !descontos.some(item => item.codigo === codigoDesconto)) {
      opcoes.push(new Option('Desconto selecionado', codigoDesconto));
    }
    seletor.replaceChildren(new Option('Sem desconto', ''), ...opcoes);
    seletor.value = codigoDesconto || '';
  }

  async function carregarDescontos() {
    try {
      const { obterAuth } = await import('./sessao.mjs');
      const auth = await obterAuth();
      const { data } = await auth.getSession();
      if (!data?.session) {
        descontos = [];
      } else {
        const resposta = await fetch('/api/gamificacao', {
          cache: 'no-store',
          headers: { Authorization: 'Bearer ' + data.session.access_token },
        });
        if (!resposta.ok) throw new Error('Recompensas indisponíveis');
        const dados = await resposta.json();
        descontos = dados.recompensas.filter(item => item.desconto_percentual && item.resgatada && !item.usada);
      }
    } catch {
      descontos = [];
    }
    atualizarDescontos();
    renderCart();
  }

  function renderCart() {
    const n = carrinho.reduce((s, c) => s + c.q, 0);
    const bloqueado = finalizando ? 'disabled' : '';
    $('#cart-n').textContent = `${n} ite${n === 1 ? 'm' : 'ns'} no seu carrinho`;
    $('#cart-lista').innerHTML = carrinho.length ? carrinho.map(c => `
      <div class="item">${foto(c.img)}
        <div><b>${textoSeguro(c.nome)}</b><small>${textoSeguro(c.variante)}</small>
          <div class="qtd"><button data-q="-1" data-id="${c.id}" aria-label="Diminuir" ${bloqueado}>${ic('minus')}</button><span>${c.q}</span><button data-q="1" data-id="${c.id}" aria-label="Aumentar" ${bloqueado}>${ic('plus')}</button></div></div>
        <div class="fim"><button data-rm="${c.id}" aria-label="Remover" ${bloqueado}>${ic('close')}</button><span class="preco">${moeda(c.preco * c.q)}</span></div>
      </div>`).join('') : '<p class="vazio">Seu carrinho está vazio.</p>';
    const subtotal = carrinho.reduce((soma, item) => soma + Math.round(item.preco * 100) * item.q, 0);
    const percentual = descontos.find(item => item.codigo === codigoDesconto)?.desconto_percentual ?? 0;
    const desconto = Math.round(subtotal * percentual / 100);
    $('#cart-recompensas').hidden = !n;
    $('#cart-desconto').disabled = finalizando;
    $('#cart-tot').innerHTML = desconto
      ? `<div><span>Subtotal</span><b>${moeda(subtotal / 100)}</b></div>
         <div><span>Desconto estimado</span><b>−${moeda(desconto / 100)}</b></div>
         <div class="total"><span>Total estimado</span><b>${moeda((subtotal - desconto) / 100)}</b></div>`
      : `<div class="total"><span>Total dos produtos</span><b>${moeda(subtotal / 100)}</b></div>`;
    $('#finalizar-compra').disabled = finalizando || !n;
    $$('[data-q]').forEach(botao => botao.onclick = () => {
      const item = carrinho.find(atual => atual.id === botao.dataset.id);
      item.q += Number(botao.dataset.q);
      if (item.q < 1) carrinho = carrinho.filter(atual => atual !== item);
      mostrarRetorno('');
      renderCart();
    });
    $$('[data-rm]').forEach(botao => botao.onclick = () => {
      carrinho = carrinho.filter(item => item.id !== botao.dataset.rm);
      mostrarRetorno('');
      renderCart();
    });
    salvarCarrinho();
  }

  async function finalizarCompra() {
    if (finalizando || !carrinho.length) return;
    if (carrinho.some(item => !Number.isInteger(item.idProduto) || item.idProduto <= 0)) {
      mostrarRetorno('Remova os itens demonstrativos e adicione os produtos pelo catálogo para finalizar.', true);
      return;
    }

    finalizando = true;
    mostrarRetorno('Registrando seu pedido…');
    renderCart();

    const irParaLogin = () => location.assign('login.html?voltar=carrinho');
    try {
      const { obterAuth } = await import('./sessao.mjs');
      const auth = await obterAuth();
      const { data, error } = await auth.getSession();
      if (error && error.name !== 'AuthSessionMissingError') throw error;
      if (!data?.session) {
        irParaLogin();
        return;
      }

      const itens = carrinho.map(item => ({ id_produto: item.idProduto, quantidade: item.q }))
        .sort((a, b) => a.id_produto - b.id_produto);
      const assinatura = JSON.stringify(codigoDesconto
        ? [data.session.user.id, itens, codigoDesconto] : [data.session.user.id, itens]);
      if (tentativa?.assinatura !== assinatura || typeof tentativa.chave !== 'string') {
        tentativa = { assinatura, chave: crypto.randomUUID() };
        salvarCarrinho();
      }

      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token },
        body: JSON.stringify({ chave_solicitacao: tentativa.chave, itens, codigo_recompensa: codigoDesconto ?? null }),
      });

      if (resposta.status === 401) {
        irParaLogin();
        return;
      }

      const resultado = await resposta.json();
      if (!resposta.ok) {
        mostrarRetorno(resultado.erro || 'Não foi possível finalizar a compra.', true);
        return;
      }

      if (!resultado.id_pedido) throw new Error('Resposta sem pedido');
      carrinho = [];
      tentativa = null;
      codigoDesconto = null;
      salvarCarrinho();
      location.assign('perfil.html#pedidos');
    } catch {
      mostrarRetorno('Não foi possível confirmar o pedido. Tente novamente com o mesmo carrinho.', true);
    } finally {
      finalizando = false;
      renderCart();
    }
  }

  $('#finalizar-compra').addEventListener('click', finalizarCompra);
  $('#cart-desconto').addEventListener('change', evento => {
    codigoDesconto = evento.target.value || null;
    mostrarRetorno('');
    renderCart();
  });
  atualizarDescontos();
  renderCart();
  if ($('[data-shop], [data-produto], [data-perfil]')) iniciarFavoritos();
  if (new URLSearchParams(location.search).get('carrinho') === '1' && carrinho.length) abrir('cart');

  document.addEventListener('driplab:add-to-cart', (evento) => {
    const item = evento.detail;
    if (!Number.isInteger(item.id_produto) || item.id_produto <= 0) return;

    adicionarAoCarrinho({
      id: item.compravel ? String(item.id_produto) : 'demo-' + item.id_produto,
      idProduto: item.compravel ? item.id_produto : null,
      nome: item.nome_produto,
      variante: item.nome_categoria || 'Produto',
      preco: Number(item.preco),
      img: produtos.find(produto => produto.nome === item.nome_produto)?.img || '--img-prod-bone',
    });
  });
  $$('[data-contagem]').forEach(el => {
    const alvo = el.dataset.contagem ? new Date(el.dataset.contagem).getTime() : Date.now() + (6 * 86400 + 19 * 3600 + 59 * 60 + 11) * 1000;
    const pad = n => String(n).padStart(2, '0');
    const un = ['dias', 'horas', 'min', 'seg'];
    const tick = () => {
      const t = Math.max(0, Math.floor((alvo - Date.now()) / 1000));
      const v = [Math.floor(t / 86400), Math.floor(t % 86400 / 3600), Math.floor(t % 3600 / 60), t % 60];
      el.innerHTML = v.map((x, i) => `<div>${pad(x)}<small>${un[i].toUpperCase()}</small></div>${i < 3 ? '<span class="sep">:</span>' : ''}`).join('');
    };
    tick(); setInterval(tick, 1000);
  });

  $$('.olho').forEach(b => b.addEventListener('click', () => {
    const i = b.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password';
    b.setAttribute('aria-label', i.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
  }));
})();
