// Comprobante de aumento en PDF (A4), generado sin librerías.

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Documento en blanco y negro: se lee e imprime igual en cualquier equipo.
const TINTA = '0.10 0.10 0.10';
const GRIS = '0.36 0.36 0.36';
const LINEA = '0.76 0.76 0.76';
const FONDO = '0.945 0.945 0.945';
const MARGEN = 56;
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

// Anchos de Helvetica en milésimas, para alinear los importes a la derecha.
const ANCHOS = {
  ' .,:;/!': 278, 'ijl': 222, 'ft': 278, 'I': 278, 'r()-': 333, 'cksvxyz': 500, 'J': 500,
  'abdeghnopqu0123456789$_': 556, 'L': 556, 'FTZ': 611, 'ABEKPSVXY&': 667, 'CDHNRUw': 722,
  'GOQ': 778, 'Mm': 833, '%': 889, 'W': 944,
};

function anchoTexto(texto, tamano, negrita = false) {
  let unidades = 0;
  // Las letras acentuadas ocupan lo mismo que sin acento.
  for (const c of String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, ' ')) {
    const grupo = Object.keys(ANCHOS).find((letras) => letras.includes(c));
    unidades += grupo ? ANCHOS[grupo] : 556;
  }
  // La negrita es algo más ancha, salvo en números y signos.
  const ajuste = negrita && /[a-zA-Z]/.test(texto) ? 1.07 : 1;
  return (unidades / 1000) * tamano * ajuste;
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
    linea(y, color = LINEA, x = MARGEN, ancho = ANCHO, grosor = 0.6) {
      ops.push(`${color} RG ${grosor} w ${x} ${y} m ${x + ancho} ${y} l S`);
    },
    marco(x, y, ancho, alto, color = LINEA) {
      ops.push(`${color} RG 0.6 w ${x} ${y} ${ancho} ${alto} re S`);
    },
    vertical(x, y, alto, color = LINEA) {
      ops.push(`${color} RG 0.6 w ${x} ${y} m ${x} ${y + alto} l S`);
    },
    // "serif" usa Times, solo para el membrete (siempre alineado a la izquierda).
    texto(valor, x, y, { tamano = 10, negrita = false, color = TINTA, derecha = false, serif = false } = {}) {
      const inicio = derecha ? x - anchoTexto(valor, tamano, negrita) : x;
      const fuente = serif ? (negrita ? 'F4' : 'F3') : (negrita ? 'F2' : 'F1');
      ops.push(`BT ${color} rg /${fuente} ${tamano} Tf 1 0 0 1 ${inicio.toFixed(2)} ${y} Tm (${literal(valor)}) Tj ET`);
    },
    contenido: () => ops.join('\n'),
  };
}

function armarPdf(stream) {
  const fuente = (nombre) => `<< /Type /Font /Subtype /Type1 /BaseFont /${nombre} /Encoding /WinAnsiEncoding >>`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    fuente('Helvetica'),
    fuente('Helvetica-Bold'),
    fuente('Times-Roman'),
    fuente('Times-Bold'),
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

  // Membrete
  pagina.texto('Zitelli & Asociados S.R.L.', MARGEN, 790, { tamano: 20, negrita: true, serif: true });
  pagina.texto('Administración de alquileres', MARGEN, 773, { tamano: 11, serif: true, color: GRIS });
  pagina.texto(`Período: ${periodo}`, derecha, 790, { tamano: 10, negrita: true, derecha: true });
  pagina.texto(`Fecha de emisión: ${fechaEmision.toLocaleDateString('es-AR')}`, derecha, 774, { tamano: 9, color: GRIS, derecha: true });
  pagina.linea(758, TINTA, MARGEN, ANCHO, 1.4);
  pagina.linea(754.5, TINTA, MARGEN, ANCHO, 0.5);

  pagina.texto('COMPROBANTE DE ACTUALIZACIÓN DE ALQUILER', MARGEN, 728, { tamano: 13, negrita: true });

  let y = 698;
  let seccion = 0;
  const titulo = (texto) => {
    seccion += 1;
    pagina.texto(`${seccion}. ${texto}`, MARGEN, y, { tamano: 10.5, negrita: true });
    y -= 12;
  };

  // Datos del contrato, en una tabla con filas
  titulo('Datos del contrato');
  const origen = origenBase === 'aumento' ? 'aumento anterior' : 'inicio del contrato';
  const inicioTabla = y;
  const columnaValor = MARGEN + 128;
  [
    ['Inquilino', inquilino],
    ['Propietario', propietario],
    ['Inmueble', inmueble],
    ['Índice de ajuste', tipoAjuste],
    ['Cálculo desde', `${fechaCorta(fechaBase)} (${origen})`],
  ].forEach(([etiqueta, valor], i) => {
    if (i > 0) pagina.linea(y);
    const lineas = partirEnLineas(valor, 9.5, ANCHO - 140);
    pagina.texto(etiqueta, MARGEN + 8, y - 13, { tamano: 9, color: GRIS });
    lineas.forEach((linea, n) => pagina.texto(linea, columnaValor + 8, y - 13 - n * 12, { tamano: 9.5 }));
    y -= 19 + (lineas.length - 1) * 12;
  });
  pagina.marco(MARGEN, y, ANCHO, inicioTabla - y);
  pagina.vertical(columnaValor, y, inicioTabla - y);
  y -= 30;

  // Importes
  titulo('Resultado de la actualización');
  const variacion = montoAnteriorValor > 0 && montoNuevoValor > 0
    ? `+${numero(((montoNuevoValor / montoAnteriorValor) - 1) * 100)} %`
    : '-';
  const anchoColumna = ANCHO / 3;
  pagina.rect(MARGEN, y - 18, ANCHO, 18, FONDO);
  [['Alquiler anterior', montoAnterior], ['Variación', variacion], ['Nuevo alquiler', montoNuevo]]
    .forEach(([etiqueta, valor], i) => {
      const x = MARGEN + anchoColumna * i + 8;
      pagina.texto(etiqueta, x, y - 12, { tamano: 9, negrita: true, color: GRIS });
      pagina.texto(valor, x, y - 36, { tamano: i === 2 ? 14 : 12, negrita: i === 2 });
      if (i > 0) pagina.vertical(MARGEN + anchoColumna * i, y - 46, 46);
    });
  pagina.linea(y - 18);
  pagina.marco(MARGEN, y - 46, ANCHO, 46);
  y -= 76;

  // Detalle del cálculo
  titulo('Detalle del cálculo');
  const { columnas: encabezados, filas } = filasDelDetalle(detalle);
  if (filas.length > 0) {
    const inicio = y;
    // Con muchos meses se achica el alto de fila para que todo entre en una página.
    const salto = filas.length > 8 ? 15 : 18;
    pagina.rect(MARGEN, y - 18, ANCHO, 18, FONDO);
    pagina.texto(encabezados[0], MARGEN + 8, y - 12, { tamano: 9, negrita: true, color: GRIS });
    pagina.texto(encabezados[1], MARGEN + 210, y - 12, { tamano: 9, negrita: true, color: GRIS });
    pagina.texto(encabezados[2], derecha - 8, y - 12, { tamano: 9, negrita: true, color: GRIS, derecha: true });
    y -= 18;
    filas.forEach(([primera, segunda, tercera]) => {
      pagina.linea(y);
      pagina.texto(primera, MARGEN + 8, y - salto + 5.5, { tamano: 9.5 });
      pagina.texto(segunda, MARGEN + 210, y - salto + 5.5, { tamano: 9.5, color: GRIS });
      pagina.texto(tercera, derecha - 8, y - salto + 5.5, { tamano: 9.5, derecha: true });
      y -= salto;
    });
    pagina.marco(MARGEN, y, ANCHO, inicio - y);
  }

  y -= 18;
  const totales = [
    detalle?.factor ? ['Factor de actualización', Number(detalle.factor).toFixed(4).replace('.', ',')] : null,
    ['Monto calculado', montoCalculado],
    montoCalculado !== montoNuevo ? ['Monto acordado (con redondeo)', montoNuevo] : null,
  ].filter(Boolean);
  totales.forEach(([etiqueta, valor], i) => {
    const ultimo = i === totales.length - 1;
    pagina.texto(etiqueta, MARGEN + 210, y, { tamano: 9.5, negrita: ultimo, color: ultimo ? TINTA : GRIS });
    pagina.texto(valor, derecha - 8, y, { tamano: 9.5, negrita: ultimo, derecha: true });
    y -= 16;
  });

  if (observaciones) {
    y -= 14;
    titulo('Observaciones');
    y -= 4;
    partirEnLineas(observaciones, 9.5, ANCHO - 20).slice(0, 5).forEach((linea) => {
      pagina.texto(linea, MARGEN, y, { tamano: 9.5 });
      y -= 13;
    });
  }

  // Firmas, si queda lugar en la página
  if (y > 150) {
    [[MARGEN, 'Por la inmobiliaria'], [derecha - 180, 'Inquilino']].forEach(([x, rotulo]) => {
      pagina.linea(104, TINTA, x, 180, 0.5);
      pagina.texto(rotulo, x, 91, { tamano: 8.5, color: GRIS });
      pagina.texto('Firma y aclaración', x, 80, { tamano: 8.5, color: GRIS });
    });
  }

  pagina.linea(58);
  pagina.texto('Documento informativo generado por el sistema Inmobi. No reemplaza al contrato de locación.', MARGEN, 44, { tamano: 8, color: GRIS });
  return armarPdf(pagina.contenido());
}
