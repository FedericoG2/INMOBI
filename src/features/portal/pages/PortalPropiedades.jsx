import { ESTADO_PROPIEDAD_LABELS, ROL, TIPO_PROPIEDAD_LABELS } from '../../../constants/estados';
import { direccionPropiedad } from '../../../services/propiedadesService';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { formatearMonto } from '../../propiedades/utils';
import { PortalMarco } from '../components/PortalMarco';
import { usePortal } from '../usePortal';

function Tabla({ datos }) {
  const paginacion = usePaginacion(datos.propiedades);
  if (datos.propiedades.length === 0) return <div className="page-empty"><p>No tenés propiedades en administración.</p></div>;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr><th>Estado</th><th>Propiedad</th><th>Tipo</th><th>Ambientes</th><th>Superficie</th><th>Alquiler actual</th></tr>
        </thead>
        <tbody>
          {paginacion.visibles.map((propiedad) => {
            const activo = datos.contratos.find((contrato) => contrato.propiedad_id === propiedad.id && contrato.estado === 'activo');
            return (
              <tr key={propiedad.id}>
                <td><span className={`estado-tag badge-${propiedad.estado}`}>{ESTADO_PROPIEDAD_LABELS[propiedad.estado]}</span></td>
                <td className="dato-clave">{propiedad.codigo ? `${propiedad.codigo} - ` : ''}{direccionPropiedad(propiedad)}</td>
                <td>{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</td>
                <td>{propiedad.ambientes ?? '—'}</td>
                <td>{propiedad.superficie_m2 ? `${Number(propiedad.superficie_m2)} m²` : '—'}</td>
                <td className="dato-clave">{activo ? formatearMonto(activo.monto_actual) : 'Sin contrato activo'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Paginacion {...paginacion} onChange={paginacion.setPagina} />
    </div>
  );
}

export function PortalPropiedades() {
  const portal = usePortal(ROL.PROPIETARIO);
  return (
    <PortalMarco {...portal} icono="building" titulo="Mis Propiedades" subtitulo="Inmuebles en administración">
      {(datos) => <Tabla datos={datos} />}
    </PortalMarco>
  );
}
