(() => {
  const container = document.getElementById('produtos-api');

  if (!container) return;

  const formatarPreco = (valor) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));

  function criarCard(produto) {
    const card = document.createElement('article');
    card.className = 'prod';

    const foto = document.createElement('div');
    foto.className = 'img foto contain';
    foto.setAttribute('role', 'img');
    foto.setAttribute('aria-label', `Imagem de ${produto.nome_produto}`);

    if (produto.imagem_url) {
      const imagem = document.createElement('img');
      imagem.src = produto.imagem_url;
      imagem.alt = produto.nome_produto;
      imagem.loading = 'lazy';
      imagem.style.cssText =
        'width:100%;height:100%;object-fit:contain;border-radius:12px';

      foto.appendChild(imagem);
    }

    const linha = document.createElement('div');
    linha.className = 'row';

    const informacoes = document.createElement('div');

    const nome = document.createElement('b');
    nome.textContent = produto.nome_produto;

    const preco = document.createElement('span');
    preco.textContent = formatarPreco(produto.preco);

    informacoes.append(nome, preco);

    const adicionar = document.createElement('button');
    adicionar.className = 'circle';
    adicionar.type = 'button';
    adicionar.textContent = '+';
    adicionar.setAttribute(
      'aria-label',
      `Adicionar ${produto.nome_produto} ao carrinho`
    );

    adicionar.addEventListener('click', () => {
      document.dispatchEvent(
        new CustomEvent('driplab:add-to-cart', { detail: produto })
      );
    });

    linha.append(informacoes, adicionar);
    card.append(foto, linha);

    return card;
  }

  async function carregarProdutos() {
    try {
      const resposta = await fetch('/api/produtos');

      if (!resposta.ok) {
        throw new Error('Falha ao buscar produtos.');
      }

      const produtos = await resposta.json();

      if (produtos.length === 0) {
        container.textContent = 'Nenhum produto cadastrado.';
        return;
      }

      container.replaceChildren(...produtos.map(criarCard));
    } catch (erro) {
      console.error(erro);
      container.textContent = 'Não foi possível carregar os produtos.';
    }
  }

  carregarProdutos();
})();