// Comprobante de aumento en PDF (A4), generado sin librerías.

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const AZUL = '0.114 0.306 0.847';
const AZUL_SUAVE = '0.937 0.957 1';
const TINTA = '0.059 0.090 0.165';
const GRIS = '0.392 0.455 0.545';
const LINEA = '0.886 0.910 0.941';
const FONDO = '0.973 0.980 0.988';
const BLANCO = '1 1 1';

const MARGEN = 48;
const ANCHO = 595 - MARGEN * 2;

function literal(texto) {
  let salida = '';
  for (const caracter of String(texto ?? '').replace(/[  ]/g, ' ')) {
    let codigo = caracter.codePointAt(0);
    // WinAnsi coincide con Latin-1 de 160 a 255; lo demás no se puede imprimir.
    if (codigo > 255 || (codigo > 126 && codigo < 160)) codigo = 63;
    if (codigo === 40 || codigo === 41 || codigo === 92) {
      salida += `\\${String.fromCharCode(codigo)}`;
    } else if (codigo >= 32 && codigo <= 126) {
      salida += String.fromCharCode(codigo);
    } else {
      salida += `\\${codigo.toString(8).padStart(3, '0')}`;
    }
  }
  return salida;
}

// Anchos aproximados de Helvetica, suficientes para alinear importes a la derecha.
function anchoTexto(texto, tamano) {
  let unidades = 0;
  for (const c of String(texto).replace(/[  ]/g, ' ')) {
    if (' .,:;ijl|!\''.includes(c)) unidades += 270;
    else if ('()-ftrI/'.includes(c)) unidades += 333;
    else if (c === '%') unidades += 889;
    else if ('mwMW'.includes(c)) unidades += 833;
    else if (c >= 'A' && c <= 'Z') unidades += 680;
    else unidades += 556;
  }
  return (unidades / 1000) * tamano;
}

function partirEnLineas(texto, tamano, anchoMaximo) {
  const lineas = [];
  let actual = '';
  String(texto ?? '').split(/\s+/).filter(Boolean).forEach((palabra) => {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && anchoTexto(prueba, tamano) > anchoMaximo) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  });
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : ['-'];
}

function lienzo() {
  const ops = [];
  return {
    rect(x, y, ancho, alto, color) {
      ops.push(`${color} rg ${x} ${y} ${ancho} ${alto} re f`);
    },
    linea(y, color = LINEA, x = MARGEN, ancho = ANCHO) {
      ops.push(`${color} RG 0.8 w ${x} ${y} m ${x + ancho} ${y} l S`);
    },
    texto(valor, x, y, { tamano = 10, negrita = false, color = TINTA, derecha = false } = {}) {
      const inicio = derecha ? x - anchoTexto(valor, tamano) : x;
      ops.push(`BT ${color} rg /${negrita ? 'F2' : 'F1'} ${tamano} Tf 1 0 0 1 ${inicio.toFixed(2)} ${y} Tm (${literal(valor)}) Tj ET`);
    },
    contenido: () => ops.join('\n'),
  };
}

function armarPdf(stream) {
  const fuente = (nombre) => `<< /Type /Font /Subtype /Type1 /BaseFont /${nombre} /Encoding /WinAnsiEncoding >>`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    fuente('Helvetica'),
    fuente('Helvetica-Bold'),
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objetos.map((objeto, indice) => {
    const posicion = pdf.length;
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    return posicion;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((posicion) => `${String(posicion).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function fechaCorta(fecha) {
  if (!fecha) return '-';
  const partes = String(fecha).slice(0, 10).split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(fecha);
}

const numero = (valor, decimales = 2) => Number(valor).toLocaleString('es-AR', { maximumFractionDigits: decimales });

function filasDelDetalle(detalle) {
  const origen = (valor, fuente) => {
    if (valor == null) return 'Sin dato';
    return fuente === 'manual' ? 'Carga manual' : 'Oficial';
  };

  if (detalle?.tipo === 'ipc') {
    return {
      columnas: ['Mes', 'Origen del dato', 'Variación IPC'],
      filas: (detalle.meses || []).map((mes, i) => [
        mes.etiqueta || `${MESES[mes.mes - 1]} ${mes.anio}`,
        origen(detalle.valores?.[i], detalle.origenes?.[i]),
        detalle.valores?.[i] != null ? `${numero(detalle.valores[i])} %` : '-',
      ]),
    };
  }

  if (detalle?.tipo === 'icl') {
    return {
      columnas: ['Fecha', 'Origen del dato', 'Valor ICL'],
      filas: [
        [`${fechaCorta(detalle.fechaInicio)} (inicial)`, origen(detalle.valorInicio, detalle.origenInicio), detalle.valorInicio != null ? numero(detalle.valorInicio, 4) : '-'],
        [`${fechaCorta(detalle.fechaFin)} (final)`, origen(detalle.valorFin, detalle.origenFin), detalle.valorFin != null ? numero(detalle.valorFin, 4) : '-'],
      ],
    };
  }

  return { columnas: [], filas: [] };
}

export function generarComprobanteAumentoPdf({
  periodo,
  inquilino,
  inmueble,
  propietario,
  tipoAjuste,
  fechaBase,
  origenBase,
  montoAnterior,
  montoAnteriorValor,
  detalle,
  montoCalculado,
  montoNuevo,
  montoNuevoValor,
  observaciones,
  fechaEmision = new Date(),
}) {
  const pagina = lienzo();
  const derecha = MARGEN + ANCHO;

  // Encabezado
  pagina.rect(0, 746, 595, 96, AZUL);
  pagina.texto('INMOBI', MARGEN, 796, { tamano: 22, negrita: true, color: BLANCO });
  pagina.texto('Comprobante de aumento de alquiler', MARGEN, 774, { tamano: 11, color: BLANCO });
  pagina.texto(periodo, derecha, 796, { tamano: 14, negrita: true, color: BLANCO, derecha: true });
  pagina.texto(`Emitido el ${fechaEmision.toLocaleDateString('es-AR')}`, derecha, 774, { tamano: 10, color: BLANCO, derecha: true });

  let y = 712;
  const titulo = (texto) => {
    pagina.texto(texto.toUpperCase(), MARGEN, y, { tamano: 9, negrita: true, color: AZUL });
    pagina.linea(y - 8);
    y -= 28;
  };

  // Datos del contrato
  titulo('Datos del contrato');
  const origen = origenBase === 'aumento' ? 'aumento anterior' : 'inicio del contrato';
  [
    ['Inquilino', inquilino],
    ['Propietario', propietario],
    ['Inmueble', inmueble],
    ['Índice de ajuste', tipoAjuste],
    ['Cálculo desde', `${fechaCorta(fechaBase)} (${origen})`],
  ].forEach(([etiqueta, valor]) => {
    pagina.texto(etiqueta, MARGEN, y, { color: GRIS });
    partirEnLineas(valor, 10, ANCHO - 130).forEach((linea, i) => {
      if (i > 0) y -= 14;
      pagina.texto(linea, MARGEN + 130, y, { negrita: true });
    });
    y -= 18;
  });

  // Resultado
  y -= 10;
  const altoCaja = 72;
  pagina.rect(MARGEN, y - altoCaja, ANCHO, altoCaja, AZUL_SUAVE);
  const variacion = montoAnteriorValor > 0 && montoNuevoValor > 0
    ? `+${numero(((montoNuevoValor / montoAnteriorValor) - 1) * 100)} %`
    : '-';
  const columnas = [MARGEN + 16, MARGEN + 190, MARGEN + 320];
  [['Alquiler anterior', montoAnterior], ['Variación', variacion], ['Nuevo alquiler', montoNuevo]]
    .forEach(([etiqueta, valor], i) => {
      pagina.texto(etiqueta, columnas[i], y - 24, { tamano: 9, color: GRIS });
      pagina.texto(valor, columnas[i], y - 50, {
        tamano: i === 2 ? 20 : 14,
        negrita: true,
        color: i === 2 ? AZUL : TINTA,
      });
    });
  y -= altoCaja + 30;

  // Detalle del cálculo
  titulo('Detalle del cálculo');
  const { columnas: encabezados, filas } = filasDelDetalle(detalle);
  if (filas.length > 0) {
    pagina.rect(MARGEN, y - 6, ANCHO, 20, FONDO);
    pagina.texto(encabezados[0], MARGEN + 8, y, { tamano: 9, negrita: true, color: GRIS });
    pagina.texto(encabezados[1], MARGEN + 210, y, { tamano: 9, negrita: true, color: GRIS });
    pagina.texto(encabezados[2], derecha - 8, y, { tamano: 9, negrita: true, color: GRIS, derecha: true });
    y -= 22;
    // Con muchos meses se achica el alto de fila para que todo entre en una página.
    const salto = filas.length > 8 ? 15 : 20;
    filas.forEach(([primera, segunda, tercera]) => {
      pagina.texto(primera, MARGEN + 8, y);
      pagina.texto(segunda, MARGEN + 210, y, { color: GRIS });
      pagina.texto(tercera, derecha - 8, y, { negrita: true, derecha: true });
      pagina.linea(y - 6);
      y -= salto;
    });
  }

  y -= 6;
  const totales = [
    detalle?.factor ? ['Factor de actualización', Number(detalle.factor).toFixed(4).replace('.', ',')] : null,
    ['Monto calculado', montoCalculado],
    montoCalculado !== montoNuevo ? ['Monto acordado (con redondeo)', montoNuevo] : null,
  ].filter(Boolean);
  totales.forEach(([etiqueta, valor]) => {
    pagina.texto(etiqueta, MARGEN + 210, y, { color: GRIS });
    pagina.texto(valor, derecha - 8, y, { negrita: true, derecha: true });
    y -= 18;
  });

  if (observaciones) {
    y -= 14;
    titulo('Observaciones');
    partirEnLineas(observaciones, 10, ANCHO - 20).slice(0, 5).forEach((linea) => {
      pagina.texto(linea, MARGEN, y);
      y -= 15;
    });
  }

  pagina.linea(60);
  pagina.texto('Documento informativo emitido por Inmobi. No reemplaza al contrato de locación.', MARGEN, 44, { tamano: 8, color: GRIS });

  return armarPdf(pagina.contenido());
}
