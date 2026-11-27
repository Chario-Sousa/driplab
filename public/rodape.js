(() => {
  const pagina = window.location.pathname.split('/').pop() || 'index.html';
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="wrap">
      <div class="row">
        <a class="logo" href="index.html"><img src="imagens/marca/logo-driplab.png" width="876" height="216" alt="DripLab" loading="lazy"></a>
        <nav class="menu" aria-label="Navegação do rodapé">
          <a href="index.html">Início</a>
          <a href="shop.html">Shop</a>
          <a href="index.html#drops">Novidades</a>
          <a href="colecoes.html">Coleções</a>
          <a href="comunidade.html">Comunidade</a>
          <a href="sobre.html">Sobre</a>
        </nav>
        <nav class="social" aria-label="Redes sociais">
          <a href="https://www.instagram.com/" aria-label="Instagram"><img src="imagens/instagram.svg" alt=""></a>
          <a href="https://www.tiktok.com/" aria-label="TikTok"><img src="imagens/tiktok.svg" alt=""></a>
          <a href="https://www.youtube.com/" aria-label="YouTube"><img src="imagens/youtube.svg" alt=""></a>
          <a href="https://x.com/" aria-label="X"><img src="imagens/x.svg" alt=""></a>
        </nav>
      </div>
      <div class="legal"><span>© 2026 <span class="accent">DripLab.</span> Todos os direitos reservados.</span><span>STREETWEAR DIGITAL-FIRST</span></div>
    </div>
  `;
  footer.querySelector(`.menu a[href="${CSS.escape(pagina)}"]`)?.setAttribute('aria-current', 'page');
  document.currentScript.before(footer);
})();
