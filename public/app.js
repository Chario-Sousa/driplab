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

  $$('[data-ic]').forEach(el => { el.outerHTML = ic(el.dataset.ic, el.className); });

  const produtos = [
    { id: 'moletom-essential', nome: 'Moletom Essential', variante: 'Preto / G', preco: 349.90, img: '--img-prod-moletom-essential', info: 'Moletom / Preto' },
    { id: 'tshirt-logo', nome: 'T-Shirt Logo', variante: 'Oversized / Branco / G', preco: 159.90, img: '--img-prod-tshirt-logo', info: 'Branco / M' },
    { id: 'cargo-pants', nome: 'Cargo Pants', variante: 'Preto / G', preco: 299.90, img: '--img-prod-cargo-pants', info: 'Preto / G' },
    { id: 'bone', nome: 'Boné DripLab', variante: 'Preto / Único', preco: 129.90, img: '--img-prod-bone', info: 'Preto / Único' },
    { id: 'jaqueta-tech', nome: 'Jaqueta Tech', variante: 'Preto / G', preco: 399.90, img: '--img-prod-jaqueta-tech', info: 'Preto / G' }
  ];
  const buscaProdutos = [
    { nome: 'Moletom Essential', sub: 'Moletom / Preto', preco: 349.90, img: '--img-prod-moletom-essential' },
    { nome: 'Moletom Oversized', sub: 'Moletom / Branco', preco: 379.90, img: '--img-prod-moletom-oversized' },
    { nome: 'Moletom Tech', sub: 'Moletom / Cinza', preco: 399.90, img: '--img-prod-moletom-tech' },
    { nome: 'Moletom DripLab Logo', sub: 'Moletom / Preto', preco: 329.90, img: '--img-prod-moletom-logo' }
  ];
  const sugestoes = ['moletom drip lab', 'moletom oversized', 'moletom preto', 'moletom com capuz', 'moletom feminino'];
  const foto = (v, cls = '') => `<div class="foto ${cls}" style="--foto:var(${v})" role="img" aria-label="Imagem do produto"></div>`;

  let favoritos = produtos.slice(0, 5).map(p => p.id);
  const chaveCarrinho = 'driplab:carrinho';
  const rascunho = lerCarrinho();
  let carrinho = rascunho.itens;
  let tentativa = rascunho.tentativa;
  let finalizando = false;
  const prod = id => produtos.find(p => p.id === id);
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
      return { itens, tentativa: dados?.tentativa };
    } catch {
      return { itens: [] };
    }
  }

  function salvarCarrinho() {
    try {
      sessionStorage.setItem(chaveCarrinho, JSON.stringify({ itens: carrinho, tentativa }));
    } catch {
      return;
    }
  }


  document.body.insertAdjacentHTML('beforeend', `
    <div class="veu" id="veu"></div>

    <div class="busca" id="busca" role="dialog" aria-label="Buscar" aria-hidden="true">
      <div class="busca-topo">
        <label class="campo busca-campo">${ic('search')}
          <input id="busca-in" type="search" placeholder="Buscar produtos, coleções..." autocomplete="off">
          <button type="button" id="busca-limpar" aria-label="Limpar">${ic('close')}</button>
        </label>
        <button class="cancelar" type="button" data-fechar>Cancelar</button>
      </div>
      <div class="abas">${['Tudo', 'Produtos', 'Coleções', 'Marcas', 'Conteúdo'].map((a, i) => `<button type="button" class="${i ? '' : 'on'}">${a}</button>`).join('')}</div>
      <div class="busca-corpo">
        <div><h5>Produtos</h5><div id="busca-res"></div></div>
        <div>
          <h5>Sugestões</h5>
          <div class="sug">${sugestoes.map(s => `<a href="#" data-sug="${s}">${ic('search')}${s}</a>`).join('')}</div>
          <h5 style="margin-top:1.4rem">Coleções</h5>
          <a class="col-mini" href="colecoes.html"><div class="foto" style="--foto:var(--img-busca-colecao)" role="img" aria-label="Coleção Drip Essentials"></div><div><b>DRIP ESSENTIALS</b><br><small>Ver coleção</small></div>${ic('chev')}</a>
        </div>
        <aside class="promo"><span class="tag" style="align-self:flex-start">Drops exclusivos</span><h4>Moletons exclusivos</h4><p>Estilo, conforto e atitude em cada detalhe.</p><a class="btn sm" href="colecoes.html">Ver todos →</a></aside>
      </div>
    </div>

    <aside class="gaveta fav" id="g-fav" aria-label="Favoritos" aria-hidden="true">
      <div class="g-topo">${ic('star')}<div><h2>Meus favoritos</h2><small id="fav-n"></small></div><button class="circle fechar" data-fechar aria-label="Fechar">${ic('close')}</button></div>
      <div class="g-lista" id="fav-lista"></div>
      <a class="btn-borda" href="perfil.html">Ver todos os favoritos ${ic('arrow')}</a>
    </aside>

    <aside class="gaveta" id="g-cart" aria-label="Carrinho" aria-hidden="true">
      <div class="g-topo">${ic('cart')}<div><h2>Carrinho</h2><small id="cart-n"></small></div><button class="circle fechar" data-fechar aria-label="Fechar">${ic('close')}</button></div>
      <div class="g-lista" id="cart-lista"></div>
      <div class="totais" id="cart-tot"></div>
      <p class="auth-retorno" id="cart-retorno" role="status" hidden></p>
      <button class="btn-cheio" id="finalizar-compra" type="button">${ic('bag')} Finalizar compra ${ic('arrow')}</button>
    </aside>`);

  const veu = $('#veu');
  const alvos = { busca: $('#busca'), fav: $('#g-fav'), cart: $('#g-cart') };
  function abrir(k) {
    Object.values(alvos).forEach(e => { e.classList.remove('on'); e.setAttribute('aria-hidden', 'true'); });
    alvos[k].classList.add('on'); alvos[k].setAttribute('aria-hidden', 'false'); veu.classList.add('on');
    if (k === 'busca') $('#busca-in').focus();
  }
  function fechar() {
    Object.values(alvos).forEach(e => { e.classList.remove('on'); e.setAttribute('aria-hidden', 'true'); });
    veu.classList.remove('on');
  }
  veu.addEventListener('click', fechar);
  $$('[data-fechar]').forEach(b => b.addEventListener('click', fechar));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });

  const liga = (rotulo, fn) => $$(`.header .circle[aria-label="${rotulo}"]`).forEach(b => b.addEventListener('click', fn));
  liga('Buscar', () => abrir('busca'));
  liga('Perfil', () => { location.href = 'perfil.html'; });
  liga('Favoritos', () => abrir('fav'));
  liga('Carrinho', () => abrir('cart'));

  function renderBusca(t = '') {
    const l = buscaProdutos.filter(p => p.nome.toLowerCase().includes(t.toLowerCase()));
    $('#busca-res').innerHTML = l.length ? l.map(p => `
      <a class="res" href="colecoes.html">${foto(p.img)}<div><b>${p.nome}</b><small>${p.sub}</small></div><b>${moeda(p.preco)}</b>${ic('arrow')}</a>`).join('')
      : '<p class="vazio">Nenhum produto encontrado.</p>';
  }
  renderBusca();
  $('#busca-in').addEventListener('input', e => renderBusca(e.target.value));
  $('#busca-limpar').addEventListener('click', () => { $('#busca-in').value = ''; renderBusca(); $('#busca-in').focus(); });
  $$('[data-sug]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); $('#busca-in').value = a.dataset.sug; renderBusca(a.dataset.sug); }));
  $$('.abas button').forEach(b => b.addEventListener('click', () => { $$('.abas button').forEach(x => x.classList.toggle('on', x === b)); }));

  function renderFav() {
    $('#fav-n').textContent = `${favoritos.length} produto${favoritos.length === 1 ? '' : 's'} salvo${favoritos.length === 1 ? '' : 's'}`;
    $('#fav-lista').innerHTML = favoritos.length ? favoritos.map(id => { const p = prod(id); return `
      <div class="item" style="grid-template-columns:72px 1fr auto">${foto(p.img)}
        <div><b>${p.nome}</b><small>${p.info}</small><b style="margin-top:.5rem">${moeda(p.preco)}</b></div>
        <div class="fim"><button data-fav-rm="${id}" aria-label="Remover">${ic('trash')}</button><button data-fav-add="${id}" aria-label="Adicionar ao carrinho">${ic('cart')}</button></div>
      </div>`; }).join('') : '<p class="vazio">Você ainda não favoritou nada.</p>';
    $$('[data-fav-rm]').forEach(b => b.onclick = () => { favoritos = favoritos.filter(x => x !== b.dataset.favRm); renderFav(); });
    $$('[data-fav-add]').forEach(b => b.onclick = () => adicionarAoCarrinho(prod(b.dataset.favAdd)));
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
    const total = carrinho.reduce((soma, item) => soma + item.preco * item.q, 0);
    $('#cart-tot').innerHTML = `<div class="total"><span>Total dos produtos</span><b>${moeda(total)}</b></div>`;
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
      const assinatura = JSON.stringify([data.session.user.id, itens]);
      if (tentativa?.assinatura !== assinatura || typeof tentativa.chave !== 'string') {
        tentativa = { assinatura, chave: crypto.randomUUID() };
        salvarCarrinho();
      }

      const resposta = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token },
        body: JSON.stringify({ chave_solicitacao: tentativa.chave, itens }),
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
  renderFav(); renderCart();
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
