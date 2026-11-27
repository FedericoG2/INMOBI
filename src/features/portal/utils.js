const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const nombrePeriodo = (periodo) => `${MESES[periodo.periodo_mes - 1]} ${periodo.periodo_anio}`;

export function estadoPeriodo(periodo) {
  if (periodo.estado === 'pagado') return { clase: 'pagado', texto: 'Pagado' };
  if (periodo.estado === 'adeudado') return { clase: 'adeudado', texto: 'Adeudado' };
  return { clase: 'pendiente', texto: 'Pendiente' };
}
