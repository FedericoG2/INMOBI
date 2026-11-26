// Las etiquetas se guardan al principio de la observación: "[Visita Programada] texto libre".
export function unirObservacion(etiquetas, texto) {
  return [...etiquetas.map((etiqueta) => `[${etiqueta}]`), texto.trim()].filter(Boolean).join(' ');
}

export function separarObservacion(observacion) {
  let texto = observacion || '';
  const etiquetas = [];
  let encontrada = texto.match(/^\[([^\]]+)\]\s*/);
  while (encontrada) {
    etiquetas.push(encontrada[1]);
    texto = texto.slice(encontrada[0].length);
    encontrada = texto.match(/^\[([^\]]+)\]\s*/);
  }
  return { etiquetas, texto };
}

// Reclamos de todos los contratos recibidos, del más reciente al más antiguo.
export function reclamosDeContratos(contratos) {
  return (contratos || [])
    .flatMap((contrato) => (contrato.reclamos || []).map((reclamo) => ({ ...reclamo, contrato })))
    .sort((a, b) => String(b.creado_en || '').localeCompare(String(a.creado_en || '')));
}
