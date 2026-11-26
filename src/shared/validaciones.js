// Filtros de escritura: cada campo admite solo el tipo de dato que le corresponde.
// Se aplican al escribir y al pegar.

const quitar = (patron, maximo = 200) => (valor) => String(valor).replace(patron, '').slice(0, maximo);

export const soloLetras = quitar(/[^\p{L}\s.'’-]/gu, 80);
export const letrasYNumeros = quitar(/[^\p{L}\d\s.'’°/-]/gu, 120);
export const soloEnteros = (maximo) => quitar(/\D/g, maximo);
export const alfanumerico = (maximo) => quitar(/[^\p{L}\d\s]/gu, maximo);
export const codigoInterno = quitar(/[^a-zA-Z0-9-]/g, 20);
export const documento = quitar(/[^\d.\-\s]/g, 15);
export const telefono = quitar(/[^\d+\-\s]/g, 25);
export const sinEspacios = quitar(/\s/g, 120);

// Número con decimales: admite coma o punto y lo devuelve con punto.
export function soloDecimal(valor, { negativo = false } = {}) {
  const texto = String(valor).replace(/,/g, '.');
  const signo = negativo && texto.startsWith('-') ? '-' : '';
  const [entero, ...resto] = texto.replace(/[^\d.]/g, '').split('.');
  const decimales = resto.length ? `.${resto.join('').slice(0, 4)}` : '';
  return `${signo}${entero.slice(0, 9)}${decimales}`;
}
