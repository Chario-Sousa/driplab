const capas = new Map([
  ['essentials', 'essentials'],
  ['drop inicial', 'essentials'],
  ['caps collection', 'caps-collection'],
  ['zona norte', 'zona-norte'],
  ['summer vibes', 'summer-vibes'],
  ['archive 01', 'archive-01'],
  ['rio capital', 'rio-capital'],
  ['blackout', 'blackout'],
  ['all black', 'all-black'],
]);

export function capaColecao(nome, capaPublicada) {
  if (capaPublicada) return capaPublicada;
  const chave = nome?.trim().toLowerCase().replace(/\s+/g, ' ');
  const arquivo = capas.get(chave);
  return arquivo ? new URL('./imagens/colecoes/' + arquivo + '.png', import.meta.url).href : null;
}
