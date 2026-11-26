const ESTADOS_VIGENTES = ['activo', 'vencido', 'programado'];

export function contratoVigente(propiedad) {
  return contratosVigentes(propiedad)[0] || null;
}

// Un inquilino puede tener varios a la vez.
export function contratosVigentes(registro) {
  return (registro?.contratos || []).filter((contrato) => ESTADOS_VIGENTES.includes(contrato.estado));
}

// Del más reciente al más antiguo.
export function ordenarContratos(contratos) {
  return [...(contratos || [])].sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)));
}

export function formatearFecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

export function formatearMonto(monto) {
  if (monto == null) return '—';
  return `$ ${Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
