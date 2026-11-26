import { ESTADO_CONTRATO_LABELS } from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Icon } from '../../../shared/components/Icons';
import { formatearFecha, formatearMonto, ordenarContratos } from '../../propiedades/utils';
import '../../../shared/styles/detalle.css';
import './ContratoDetalle.css';

// Historial de contratos para los detalles. "mostrar" define la columna de contexto.
export function ContratosHistorial({ contratos, mostrar, onVer }) {
  const lista = ordenarContratos(contratos);

  if (lista.length === 0) return <p className="cd-vacio">Todavía no tiene contratos.</p>;

  return (
    <div className="cd-tabla-contenedor">
      <table className="cd-tabla">
        <thead>
          <tr>
            <th>Estado</th>
            <th>{mostrar === 'inquilino' ? 'Inquilino' : 'Propiedad'}</th>
            <th>Vigencia</th>
            <th className="cd-num">Alquiler</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((contrato) => (
            <tr key={contrato.id}>
              <td>
                <span className={`estado-tag estado-${contrato.estado}`}>{ESTADO_CONTRATO_LABELS[contrato.estado]}</span>
              </td>
              <td>
                {mostrar === 'inquilino'
                  ? nombreInquilino(contrato.inquilinos)
                  : [contrato.propiedades?.codigo, contrato.propiedades && direccionPropiedad(contrato.propiedades)]
                    .filter(Boolean)
                    .join(' - ')}
              </td>
              <td>{formatearFecha(contrato.fecha_inicio)} al {formatearFecha(contrato.fecha_fin)}</td>
              <td className="cd-num">{formatearMonto(contrato.monto_actual)}</td>
              <td className="cd-num">
                <button
                  type="button"
                  className="cd-icono-btn"
                  onClick={() => onVer(contrato.id)}
                  title="Ver contrato"
                  aria-label="Ver contrato"
                >
                  <Icon name="eye" size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
