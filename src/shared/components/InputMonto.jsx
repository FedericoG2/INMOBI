function formatear(valor) {
  if (valor === '' || valor == null) return '';
  const [entero, decimal] = String(valor).split('.');
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${conPuntos}${decimal !== undefined ? `,${decimal}` : ''}`;
}

// Devuelve el valor "crudo" (ej: "1500000.5"), sin símbolos ni signo negativo.
function limpiar(texto) {
  const soloNumeros = texto.replace(/[^\d,]/g, '');
  const [entero, ...resto] = soloNumeros.split(',');
  const enteroLimpio = entero.replace(/^0+(?=\d)/, '');
  if (resto.length === 0) return enteroLimpio;
  return `${enteroLimpio || '0'}.${resto.join('').slice(0, 2)}`;
}

export function InputMonto({ value, onChange, ...resto }) {
  return (
    <input
      {...resto}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatear(value)}
      onChange={(evento) => onChange(limpiar(evento.target.value))}
    />
  );
}
