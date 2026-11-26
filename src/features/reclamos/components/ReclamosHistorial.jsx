import {
  CATEGORIA_RECLAMO_LABELS,
  ESTADO_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { formatearFecha } from '../../propiedades/utils';
import { reclamosDeContratos } from '../utils';
import '../../../shared/styles/detalle.css';
import '../../../shared/styles/listado.css';
import './ReclamoDetalle.css';

export function ReclamosHistorial({ contratos, mostrar }) {
  const reclamos = reclamosDeContratos(contratos);

  if (reclamos.length === 0) return <p className="cd-vacio">Todavía no tiene reclamos.</p>;

  return (
    <div className="cd-tabla-contenedor">
      <table className="cd-tabla">
        <thead>
          <tr>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Reclamo</th>
            <th>{mostrar === 'inquilino' ? 'Inquilino' : 'Propiedad'}</th>
            <th>Prioridad</th>
          </tr>
        </thead>
        <tbody>
          {reclamos.map((reclamo) => (
            <tr key={reclamo.id}>
              <td>
                <span className={`estado-tag rc-estado-${reclamo.estado}`}>{ESTADO_RECLAMO_LABELS[reclamo.estado]}</span>
              </td>
              <td>{formatearFecha(reclamo.creado_en)}</td>
              <td>
                <strong>{reclamo.titulo}</strong>
                <div className="ls-secundaria">{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]}</div>
              </td>
              <td>
                {mostrar === 'inquilino'
                  ? nombreInquilino(reclamo.contrato.inquilinos)
                  : reclamo.contrato.propiedades && direccionPropiedad(reclamo.contrato.propiedades)}
              </td>
              <td>
                <span className={`estado-tag rc-prioridad-${reclamo.prioridad}`}>
                  {PRIORIDAD_RECLAMO_LABELS[reclamo.prioridad]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
