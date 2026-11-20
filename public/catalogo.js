(() => {
  const container = document.getElementById('produtos-api');
  const shop = document.querySelector('[data-shop]');
  const detalhe = document.querySelector('[data-produto]');

  if (!container && !detalhe) return;
  const produtosEstaticos = [
    {
      id_produto: 1,
      nome_produto: 'T-Shirt Logo',
      imagem_url: null,
      preco: 159.90,
      nome_categoria: 'Camisetas',
    },
    {
      id_produto: 2,
      nome_produto: 'Moletom Essential',
      imagem_url: null,
      preco: 349.90,
      nome_categoria: 'Moletons',
    },
    {
      id_produto: 3,
      nome_produto: 'Cargo Pants',
      imagem_url: null,
      preco: 299.90,
      nome_categoria: 'Calças',
    },
    {
      id_produto: 4,
      nome_produto: 'Boné DripLab',
      imagem_url: null,
      preco: 129.90,
      nome_categoria: 'Acessórios',
    },
    {
      id_produto: 5,
      nome_produto: 'Jaqueta Tech',
      imagem_url: null,
      preco: 399.90,
      nome_categoria: 'Jaquetas',
    },
  ];
  const formatarPreco = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));

  const mensagens = {
    agendado: 'Em breve',
    esgotado: 'Drop esgotado',
    encerrado: 'Drop encerrado',
    inativo: 'Indisponível',
  };

  function estadoProduto(produto) {
    return mensagens[produto.estado_drop]
      || (produto.estoque != null && Number(produto.estoque) <= 0 ? 'Sem estoque' : '');
  }

  function adicionarAoCarrinho(produto, compravel) {
    document.dispatchEvent(
      new CustomEvent('driplab:add-to-cart', { detail: { ...produto, compravel } })
    );
  }

  function preencherFoto(foto, produto, lazy = false) {
    foto.replaceChildren();
    foto.setAttribute('role', 'img');
    foto.setAttribute('aria-label', `Imagem de ${produto.nome_produto}`);
    if (!produto.imagem_url) return;

    const imagem = document.createElement('img');
    imagem.alt = produto.nome_produto;
    if (lazy) imagem.loading = 'lazy';
    imagem.src = produto.imagem_url;
    imagem.addEventListener('error', () => imagem.remove(), { once: true });
    foto.append(imagem);
  }

  function criarCard(produto, compravel) {
    const card = document.createElement('article');
    card.className = 'prod';

    const href = 'produto.html?id=' + encodeURIComponent(produto.id_produto);
    const foto = document.createElement(compravel ? 'a' : 'div');
    foto.className = 'img foto contain';
    if (compravel) foto.href = href;
    preencherFoto(foto, produto, true);
    if (compravel) foto.removeAttribute('role');
    const imagem = foto.querySelector('img');
    if (imagem) {
      imagem.style.cssText =
        'width:100%;height:100%;object-fit:contain;border-radius:12px';
    }

    const linha = document.createElement('div');
    linha.className = 'row';

    const informacoes = document.createElement('div');

    const nome = document.createElement('b');
    if (compravel) {
      const link = document.createElement('a');
      link.className = 'produto-link';
      link.href = href;
      link.textContent = produto.nome_produto;
      nome.append(link);
    } else {
      nome.textContent = produto.nome_produto;
    }

    const preco = document.createElement('span');
    preco.textContent = formatarPreco(produto.preco);

    informacoes.append(nome, preco);
    const estado = estadoProduto(produto);
    if (estado) {
      const aviso = document.createElement('small');
      aviso.className = 'produto-indisponivel';
      aviso.textContent = estado;
      informacoes.append(aviso);
    }

    const adicionar = document.createElement('button');
    adicionar.className = 'circle';
    adicionar.type = 'button';
    adicionar.textContent = '+';
    adicionar.disabled = Boolean(estado);
    adicionar.setAttribute(
      'aria-label',
      estado ? `${produto.nome_produto}: ${estado}` : `Adicionar ${produto.nome_produto} ao carrinho`
    );

    adicionar.addEventListener('click', () => adicionarAoCarrinho(produto, compravel));

    linha.append(informacoes, adicionar);
    card.append(foto, linha);

    return card;
  }

  async function buscarProdutos() {
    const resposta = await fetch('/api/produtos', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Falha ao buscar produtos.');
    return resposta.json();
  }

  async function carregarInicio() {
    try {
      const produtos = await buscarProdutos();

      if (produtos.length === 0) {
        container.textContent = 'Nenhum produto cadastrado.';
        return;
      }

      container.replaceChildren(...produtos.map(produto => criarCard(produto, true)));
    } catch (erro) {
      console.warn('API indisponível; exibindo catálogo estático.', erro);
      container.replaceChildren(...produtosEstaticos.map(produto => criarCard(produto, false)));
    }
  }

  function iniciarShop() {
    const form = shop.querySelector('form');
    const categoria = form.elements.categoria;
    const colecao = form.elements.colecao;
    const limpar = form.querySelector('[type="reset"]');
    const status = shop.querySelector('[data-catalogo-status]');
    const tentar = shop.querySelector('[data-tentar-novamente]');
    let produtos;

    function preencherFiltro(campo, propriedade) {
      const valores = [...new Set(produtos.map(produto => produto[propriedade]).filter(Boolean))];
      valores.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const selecionado = campo.value;
      campo.replaceChildren(campo.options[0], ...valores.map(valor => new Option(valor, valor)));
      campo.value = valores.includes(selecionado) ? selecionado : '';
      campo.disabled = !valores.length;
    }

    function renderizar() {
      const visiveis = produtos.filter(produto =>
        (!categoria.value || produto.nome_categoria === categoria.value) &&
        (!colecao.value || produto.nome_colecao === colecao.value)
      );
      status.textContent = visiveis.length
        ? `${visiveis.length} ${visiveis.length === 1 ? 'produto' : 'produtos'}`
        : 'Nenhum produto encontrado.';
      limpar.disabled = !categoria.value && !colecao.value;
      container.replaceChildren(...visiveis.map(produto => criarCard(produto, true)));
    }

    async function carregar() {
      tentar.hidden = true;
      status.textContent = 'Carregando produtos...';
      try {
        produtos = await buscarProdutos();
        preencherFiltro(categoria, 'nome_categoria');
        preencherFiltro(colecao, 'nome_colecao');
        renderizar();
      } catch {
        status.textContent = 'Não foi possível carregar os produtos.';
        tentar.hidden = false;
      }
    }

    form.addEventListener('change', renderizar);
    form.addEventListener('reset', evento => {
      evento.preventDefault();
      categoria.value = '';
      colecao.value = '';
      renderizar();
    });
    tentar.addEventListener('click', carregar);
    carregar();
  }

  function iniciarDetalhe() {
    const id = new URLSearchParams(location.search).get('id') || '';
    const status = detalhe.querySelector('[data-catalogo-status]');
    if (!/^[1-9]\d*$/.test(id)) {
      status.textContent = 'Produto não encontrado.';
      return;
    }

    const quadro = detalhe.querySelector('.produto-detalhe');
    const botao = quadro.querySelector('.produto-adicionar');
    const tentar = detalhe.querySelector('[data-tentar-novamente]');
    let produto;

    function preencherTexto(campo, valor) {
      const elemento = quadro.querySelector(`[data-produto-${campo}]`);
      elemento.textContent = valor || '';
      elemento.hidden = !valor;
    }

    async function carregar() {
      tentar.hidden = true;
      status.textContent = 'Carregando produto...';
      try {
        const produtos = await buscarProdutos();
        produto = produtos.find(item => String(item.id_produto) === id);
        if (!produto) {
          status.textContent = 'Produto não encontrado.';
          return;
        }

        const estado = estadoProduto(produto);
        const estoque = Number(produto.estoque);
        const disponibilidade = estoque === 1 ? '1 unidade em estoque' : `${estoque} unidades em estoque`;
        preencherFoto(quadro.querySelector('[data-produto-foto]'), produto);
        preencherTexto('nome', produto.nome_produto);
        preencherTexto('categoria', produto.nome_categoria);
        preencherTexto('colecao', produto.nome_colecao);
        preencherTexto('preco', formatarPreco(produto.preco));
        preencherTexto('descricao', produto.descricao_produto);
        preencherTexto('estado', estado || (estoque > 0 ? disponibilidade : 'Disponível'));
        botao.disabled = Boolean(estado);
        document.title = `${produto.nome_produto} — DripLab`;
        status.textContent = '';
        quadro.hidden = false;
      } catch {
        status.textContent = 'Não foi possível carregar o produto.';
        tentar.hidden = false;
      }
    }

    botao.addEventListener('click', () => adicionarAoCarrinho(produto, true));
    tentar.addEventListener('click', carregar);
    carregar();
  }

  if (shop) {
    iniciarShop();
  } else if (detalhe) {
    iniciarDetalhe();
  } else {
    document.addEventListener('driplab:drops-alterados', carregarInicio);
    carregarInicio();
  }
})();
