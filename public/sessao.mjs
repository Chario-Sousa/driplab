let cliente;

async function criarCliente() {
  const resposta = await fetch(new URL('./auth-config.json', import.meta.url));
  if (!resposta.ok) throw new Error('Configuração do Supabase indisponível.');
  const { url, chavePublica } = await resposta.json();

  if (!globalThis.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./supabase.js', import.meta.url);
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error('Não foi possível carregar o Supabase Auth.'));
      };
      document.head.append(script);
    });
  }

  return globalThis.supabase.createClient(url, chavePublica).auth;
}

export function obterAuth() {
  cliente ??= criarCliente().catch(erro => {
    cliente = null;
    throw erro;
  });
  return cliente;
}
