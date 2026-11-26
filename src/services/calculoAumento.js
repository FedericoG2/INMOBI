export function fechaBaseDe(aumento, contrato, confirmados = []) {
  const previo = confirmados
    .filter((item) => item.contrato_id === aumento.contrato_id
      && item.estado === 'confirmado'
      && item.id !== aumento.id
      && item.fecha_aumento < aumento.fecha_aumento)
    .sort((a, b) => b.fecha_aumento.localeCompare(a.fecha_aumento))[0];

  if (previo) return { fecha: previo.fecha_aumento, origen: 'aumento' };
  return { fecha: contrato.fecha_inicio, origen: 'inicio' };
}

export function rangoMesesIPC(fechaAumento, fechaBase) {
  const [anioAumento, mesAumento] = fechaAumento.split('-').map(Number);
  let mesHasta = mesAumento - 1;
  let anioHasta = anioAumento;
  if (mesHasta === 0) {
    mesHasta = 12;
    anioHasta -= 1;
  }
  const [anioDesde, mesDesde] = fechaBase.split('-').map(Number);
  return { mesDesde, anioDesde, mesHasta, anioHasta };
}

export function mesesEntre({ anioDesde, mesDesde, anioHasta, mesHasta }) {
  const meses = [];
  let anio = anioDesde;
  let mes = mesDesde;
  while (anio < anioHasta || (anio === anioHasta && mes <= mesHasta)) {
    meses.push({ anio, mes });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
    if (meses.length > 240) break;
  }
  return meses;
}

export function completarValoresIPC(meses, indices = [], manuales = []) {
  return meses.map((mes) => {
    const oficial = indices.find((item) => Number(item.anio) === mes.anio && Number(item.mes) === mes.mes);
    if (oficial && oficial.valor != null && oficial.valor !== '') {
      return { ...mes, valor: Number(oficial.valor), origen: 'argly' };
    }
    const manual = manuales.find((item) => item.tipo === 'ipc' && Number(item.anio) === mes.anio && Number(item.mes) === mes.mes);
    if (manual) return { ...mes, valor: Number(manual.valor), origen: 'manual' };
    return { ...mes, valor: null, origen: null };
  });
}

export function montoConFactor(montoAnterior, valores) {
  const factor = valores.reduce((acumulado, valor) => acumulado * (1 + valor / 100), 1);
  return { factor, montoCalculado: Math.round(montoAnterior * factor) };
}

export function fechaICL(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
}

export function valorICL(fechaISO, indices = [], manuales = []) {
  const oficial = indices.find((item) => item.fecha === fechaICL(fechaISO));
  if (oficial && oficial.valor != null && oficial.valor !== '') {
    return { valor: Number(oficial.valor), origen: 'argly' };
  }
  const manual = manuales.find((item) => item.tipo === 'icl' && item.fecha === fechaISO);
  if (manual) return { valor: Number(manual.valor), origen: 'manual' };
  return { valor: null, origen: null };
}

export function montoConProporcion(montoAnterior, valorInicio, valorFin) {
  const factor = valorFin / valorInicio;
  return { factor, montoCalculado: Math.round(montoAnterior * factor) };
}
