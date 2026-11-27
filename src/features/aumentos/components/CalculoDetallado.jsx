import { TIPO_AJUSTE } from '../../../constants/estados';
import { etiquetaMes, formatearMonto } from '../../../services/aumentosService';

const numero = (valor, minimo = 0, maximo = 6) => (
  Number(valor).toLocaleString('es-AR', { minimumFractionDigits: minimo, maximumFractionDigits: maximo })
);
const factor = (valor) => numero(valor, 6, 6);
const porcentaje = (valor) => `${numero(valor, 0, 2)} %`;

function fecha(valor) {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${anio}`;
}

function origen(valor, fuente) {
  if (valor == null) return 'Sin dato';
  return fuente === 'manual' ? 'Carga manual' : 'Oficial';
}

function TablaIPC({ detalle }) {
  return (
    <div className="cd-tabla-contenedor">
      <table className="cd-tabla">
        <thead>
          <tr>
            <th>Mes</th>
            <th>Origen</th>
            <th className="cd-num">Variación IPC</th>
            <th className="cd-num">Factor</th>
          </tr>
        </thead>
        <tbody>
          {detalle.meses?.map((mes, indice) => {
            const valor = detalle.valores?.[indice];
            return (
              <tr key={`${mes.anio}-${mes.mes}`}>
                <td>{etiquetaMes(mes.mes)} {mes.anio}</td>
                <td>{origen(valor, detalle.origenes?.[indice])}</td>
                <td className="cd-num">{valor != null ? porcentaje(valor) : '—'}</td>
                <td className="cd-num">{valor != null ? factor(1 + valor / 100) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        {detalle.factor && (
          <tfoot>
            <tr>
              <td colSpan="2">Acumulado del período</td>
              <td className="cd-num">{porcentaje((detalle.factor - 1) * 100)}</td>
              <td className="cd-num">{factor(detalle.factor)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function TablaICL({ detalle }) {
  const filas = [
    { clave: 'inicio', nombre: 'ICL inicio', fecha: detalle.fechaInicio, valor: detalle.valorInicio, origen: detalle.origenInicio },
    { clave: 'fin', nombre: 'ICL fin', fecha: detalle.fechaFin, valor: detalle.valorFin, origen: detalle.origenFin },
  ];
  return (
    <div className="cd-tabla-contenedor">
      <table className="cd-tabla">
        <thead>
          <tr>
            <th>Índice</th>
            <th>Fecha</th>
            <th>Origen</th>
            <th className="cd-num">Valor ICL</th>
            <th className="cd-num">Factor</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave}>
              <td>{fila.nombre}</td>
              <td>{fecha(fila.fecha)}</td>
              <td>{origen(fila.valor, fila.origen)}</td>
              <td className="cd-num">{fila.valor != null ? numero(fila.valor, 2, 4) : '—'}</td>
              <td className="cd-num">{fila.clave === 'fin' && detalle.factor ? factor(detalle.factor) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Fórmula del índice y la cuenta paso a paso con los valores del contrato.
function Formula({ detalle, montoAnterior, montoCalculado }) {
  const esIPC = detalle.tipo === TIPO_AJUSTE.IPC;
  const exacto = montoAnterior * detalle.factor;

  return (
    <div className="ad-formula">
      <p className="ad-formula-titulo">Fórmula ({esIPC ? 'IPC' : 'ICL'})</p>
      <p className="ad-formula-general">
        {esIPC
          ? 'Monto nuevo = Monto actual × (1 + IPC₁ / 100) × (1 + IPC₂ / 100) × … × (1 + IPCₙ / 100)'
          : 'Monto nuevo = Monto actual × (ICL fin / ICL inicio)'}
      </p>
      <p className="ad-formula-nota">
        {esIPC
          ? 'Cada mes aumenta sobre el valor ya actualizado del mes anterior, por eso los factores se multiplican.'
          : 'El alquiler varía en la misma proporción en que varió el ICL entre las dos fechas.'}
      </p>

      <ol className="ad-pasos">
        <li>
          <span>{esIPC ? 'Factor acumulado' : 'Factor de actualización'}</span>
          <code>
            {esIPC
              ? detalle.valores.map((valor) => factor(1 + valor / 100)).join(' × ')
              : `${numero(detalle.valorFin, 2, 4)} / ${numero(detalle.valorInicio, 2, 4)}`}
            {' = '}<strong>{factor(detalle.factor)}</strong>
          </code>
        </li>
        <li>
          <span>Aplicado al alquiler actual</span>
          <code>
            {formatearMonto(montoAnterior)} × {factor(detalle.factor)} = <strong>{formatearMonto(exacto)}</strong>
          </code>
        </li>
        <li>
          <span>Redondeado al peso</span>
          <code><strong>{formatearMonto(montoCalculado || Math.round(exacto))}</strong></code>
        </li>
        <li>
          <span>Porcentaje de aumento</span>
          <code>({factor(detalle.factor)} − 1) × 100 = <strong>{porcentaje((detalle.factor - 1) * 100)}</strong></code>
        </li>
      </ol>
    </div>
  );
}

export function CalculoDetallado({ detalle, montoAnterior, montoCalculado }) {
  return (
    <>
      {detalle.tipo === TIPO_AJUSTE.IPC && <TablaIPC detalle={detalle} />}
      {detalle.tipo === TIPO_AJUSTE.ICL && <TablaICL detalle={detalle} />}
      {detalle.factor && (
        <Formula detalle={detalle} montoAnterior={montoAnterior} montoCalculado={montoCalculado} />
      )}
    </>
  );
}
