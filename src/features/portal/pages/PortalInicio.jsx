import { Link } from 'react-router-dom';
import { ESTADO_RECLAMO, ROL } from '../../../constants/estados';
import { direccionPropiedad } from '../../../services/contratosService';
import { nombreInquilino } from '../../../services/inquilinosService';
import { Icon } from '../../../shared/components/Icons';
import { formatearFecha, formatearMonto } from '../../propiedades/utils';
import { PortalMarco } from '../components/PortalMarco';
import { usePortal } from '../usePortal';
import { estadoPeriodo, nombrePeriodo } from '../utils';

function Indicadores({ items }) {
  return (
    <div className="ls-kpis">
      {items.map((item) => (
        <Link key={item.titulo} className="ls-kpi portal-kpi" to={item.destino}>
          <span className="ls-kpi-icono"><Icon name={item.icono} size={18} /></span>
          <strong>{item.valor}</strong>
          <span className="ls-kpi-titulo">{item.titulo}</span>
          <small>{item.ayuda}</small>
        </Link>
      ))}
    </div>
  );
}

export function PortalInicio({ rol }) {
  const portal = usePortal(rol);
  const esInquilino = rol === ROL.INQUILINO;
  const base = esInquilino ? '/portal/inquilino' : '/portal/propietario';
  const persona = portal.datos?.persona;

  return (
    <PortalMarco
      {...portal}
      icono="dashboard"
      titulo={persona ? `Hola, ${nombreInquilino(persona)}` : 'Inicio'}
      subtitulo={esInquilino ? 'Resumen de tu alquiler' : 'Resumen de tus propiedades'}
    >
      {({ propiedades, contratos, periodos, reclamos }) => {
        const activos = contratos.filter((contrato) => contrato.estado === 'activo');
        const pendientes = periodos.filter((periodo) => periodo.estado !== 'pagado')
          .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
        const abiertos = reclamos.filter((reclamo) => reclamo.estado !== ESTADO_RECLAMO.RESUELTO);
        const direccion = (contratoId) => direccionPropiedad(contratos.find((contrato) => contrato.id === contratoId).propiedades);

        const items = esInquilino
          ? [
            { titulo: 'Contratos activos', ayuda: 'Alquileres vigentes', valor: activos.length, icono: 'file', destino: `${base}/contratos` },
            { titulo: 'Pagos pendientes', ayuda: 'Sin confirmar', valor: pendientes.length, icono: 'receipt', destino: `${base}/pagos` },
            { titulo: 'Reclamos abiertos', ayuda: 'En seguimiento', valor: abiertos.length, icono: 'alert', destino: `${base}/reclamos` },
          ]
          : [
            { titulo: 'Propiedades', ayuda: 'En administración', valor: propiedades.length, icono: 'building', destino: `${base}/propiedades` },
            { titulo: 'Contratos activos', ayuda: 'Alquileres vigentes', valor: activos.length, icono: 'file', destino: `${base}/contratos` },
            { titulo: 'Cobros pendientes', ayuda: 'Sin confirmar', valor: pendientes.length, icono: 'receipt', destino: `${base}/alquileres` },
          ];

        return (
          <>
            <Indicadores items={items} />
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Período pendiente</th><th>Propiedad</th><th>Vencimiento</th><th>Monto</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {pendientes.length === 0 && <tr><td colSpan="5" className="portal-vacio">No hay períodos pendientes.</td></tr>}
                  {pendientes.slice(0, 4).map((periodo) => {
                    const estado = estadoPeriodo(periodo);
                    return (
                      <tr key={periodo.id}>
                        <td className="dato-clave">{nombrePeriodo(periodo)}</td>
                        <td>{direccion(periodo.contrato_id)}</td>
                        <td>{formatearFecha(periodo.fecha_vencimiento)}</td>
                        <td>{formatearMonto(periodo.monto)}</td>
                        <td><span className={`cd-estado cd-estado-${estado.clase}`}>{estado.texto}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      }}
    </PortalMarco>
  );
}
