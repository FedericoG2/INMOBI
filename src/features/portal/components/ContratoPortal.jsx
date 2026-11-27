import {
  PERIODICIDAD_AJUSTE_LABELS,
  TIPO_AJUSTE_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { useToast } from '../../../shared/components/Toast';
import { formatearFecha, formatearMonto } from '../../propiedades/utils';
import { portalService } from '../portalService';

// Detalle de solo consulta: condiciones, historial de montos y documentación.
export function ContratoPortal({ contrato, aumentos, documentos, mostrarInquilino = false }) {
  const toast = useToast();
  const propios = aumentos.filter((aumento) => aumento.contrato_id === contrato.id);
  const adjuntos = documentos.filter((documento) => documento.contrato_id === contrato.id);

  function descargar(bucket, ruta, nombre) {
    portalService.descargar(bucket, ruta, nombre).catch((err) => toast.error(err.message));
  }

  return (
    <div className="cd">
      <Tarjeta titulo="Condiciones" icono={<Icon name="file" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta="Propiedad" ancho>{direccionPropiedad(contrato.propiedades)}</Dato>
          {mostrarInquilino && <Dato etiqueta="Inquilino">{nombreInquilino(contrato.inquilinos)}</Dato>}
          <Dato etiqueta="Vigencia">{formatearFecha(contrato.fecha_inicio)} → {formatearFecha(contrato.fecha_fin)}</Dato>
          <Dato etiqueta="Monto inicial">{formatearMonto(contrato.monto_inicial)}</Dato>
          <Dato etiqueta="Monto actual" destacado>{formatearMonto(contrato.monto_actual)}</Dato>
          <Dato etiqueta="Pago del alquiler">Hasta el día {contrato.dia_vencimiento_pago} del mes siguiente</Dato>
          <Dato etiqueta="Ajuste">
            {TIPO_AJUSTE_LABELS[contrato.tipo_ajuste]} · {PERIODICIDAD_AJUSTE_LABELS[contrato.periodicidad_ajuste]}
          </Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Historial de aumentos" icono={<Icon name="trend" size={18} />} contador={propios.length || null}>
        {propios.length === 0 ? (
          <p className="cd-vacio">Todavía no hubo aumentos.</p>
        ) : (
          <div className="cd-tabla-contenedor">
            <table className="cd-tabla">
              <thead>
                <tr>
                  <th>Desde</th>
                  <th className="cd-num">Anterior</th>
                  <th className="cd-num">Nuevo</th>
                  <th>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {propios.map((aumento) => (
                  <tr key={aumento.id}>
                    <td>{formatearFecha(aumento.fecha_aumento)}</td>
                    <td className="cd-num">{formatearMonto(aumento.monto_anterior)}</td>
                    <td className="cd-num">{formatearMonto(aumento.monto_nuevo)}</td>
                    <td>
                      {aumento.ruta_comprobante ? (
                        <button
                          type="button"
                          className="portal-enlace"
                          onClick={() => descargar('comprobantes-aumentos', aumento.ruta_comprobante, `Aumento ${formatearFecha(aumento.fecha_aumento).replaceAll('/', '-')}.pdf`)}
                        >
                          <Icon name="download" size={15} /> Descargar
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Documentos" icono={<Icon name="clip" size={18} />} contador={adjuntos.length || null}>
        {adjuntos.length === 0 ? (
          <p className="cd-vacio">No hay documentos adjuntos.</p>
        ) : (
          <ul className="portal-archivos">
            {adjuntos.map((documento) => (
              <li key={documento.id}>
                <span>
                  {documento.nombre_archivo}
                  {documento.es_contrato_firmado && <em>Contrato</em>}
                </span>
                <button
                  type="button"
                  className="portal-enlace"
                  onClick={() => descargar('documentos-contratos', documento.ruta_storage, documento.nombre_archivo)}
                >
                  <Icon name="download" size={15} /> Descargar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
