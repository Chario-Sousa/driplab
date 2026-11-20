export const supabaseUrl = 'https://djfvjwwlbpdblwsotjbs.supabase.co';
export const supabaseChavePublica = 'sb_publishable_qfXmJzme2wPQRXc2ZrLdYg_nyYyMAiW';

let cliente;
let carregando;

export async function obterAuth() {
  if (!globalThis.supabase) {
    carregando ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./supabase.js', import.meta.url);
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error('Não foi possível carregar o Supabase Auth.'));
      };
      document.head.append(script);
    }).catch(erro => {
      carregando = null;
      throw erro;
    });
    await carregando;
  }

  cliente ??= globalThis.supabase.createClient(supabaseUrl, supabaseChavePublica);
  return cliente.auth;
}
