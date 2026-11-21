const tipos = ['image/jpeg', 'image/png', 'image/webp'];

export function arquivoCapaValido(arquivo) {
  return arquivo.size > 0 && arquivo.size <= 1024 * 1024 && tipos.includes(arquivo.type);
}

export function lerCapa(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve({ tipo: arquivo.type, dados: leitor.result.split(',')[1] });
    leitor.onerror = () => reject(new Error('Não foi possível ler a capa.'));
    leitor.readAsDataURL(arquivo);
  });
}
