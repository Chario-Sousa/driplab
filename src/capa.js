const maxCapa = 1024 * 1024;
const png = Buffer.from('89504e470d0a1a0a', 'hex');
const jpeg = Buffer.from('ffd8ff', 'hex');
const tiposCapa = {
  'image/jpeg': buffer => buffer.length > 3 && buffer.subarray(0, 3).equals(jpeg),
  'image/png': buffer => buffer.length > 8 && buffer.subarray(0, 8).equals(png),
  'image/webp': buffer => buffer.length > 16 && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP',
};

class ErroCapa extends Error {}

function validarCapa(capa) {
  const { tipo, dados } = capa ?? {};
  if (typeof tipo !== 'string' || !Object.hasOwn(tiposCapa, tipo)
      || typeof dados !== 'string' || dados.length > Math.ceil(maxCapa / 3) * 4) {
    throw new ErroCapa('Envie uma capa PNG, JPG ou WebP com até 1 MB.');
  }
  const buffer = Buffer.from(dados, 'base64');
  if (buffer.length > maxCapa || buffer.toString('base64') !== dados || !tiposCapa[tipo](buffer)) {
    throw new ErroCapa('O arquivo da capa não corresponde ao formato informado.');
  }
  return { tipo, buffer };
}

module.exports = { validarCapa, ErroCapa };
