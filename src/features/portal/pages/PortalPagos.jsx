import { useState } from 'react';
import { ROL } from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { formatearFecha, formatearMonto } from '../../propiedades/utils';
import { ComprobantesPortal } from '../components/ComprobantesPortal';
import { PortalMarco } from '../components/PortalMarco';
import { usePortal } from '../usePortal';
import { estadoPeriodo, nombrePeriodo } from '../utils';

function Tabla({ datos, esInquilino, recargar }) {
  const [estado, setEstado] = useState('');
  const [periodoId, setPeriodoId] = useState(null);
  const filtrados = datos.periodos.filter((periodo) => !estado || estadoPeriodo(periodo).clase === estado);
  const paginacion = usePaginacion(filtrados, estado);
  const contratoDe = (periodo) => datos.contratos.find((contrato) => contrato.id === periodo.contrato_id);
  // Se busca en la lista para que el detalle refleje un comprobante recién cargado.
  const elegido = datos.periodos.find((periodo) => periodo.id === periodoId) || null;
  const puedeCargar = (periodo) => esInquilino && periodo.estado !== 'pagado' && contratoDe(periodo).estado === 'activo';

  return (
    <>
      <div className="filtros-container">
        <select className="filter-select" aria-label="Estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="adeudado">Adeudados</option>
          <option value="pagado">Pagados</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="page-empty"><p>No hay períodos para mostrar.</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estado</th><th>Período</th><th>Propiedad</th>{!esInquilino && <th>Inquilino</th>}<th>Vencimiento</th><th>Monto</th>
                <th>Comprobantes</th><th className="ls-columna-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((periodo) => {
                const marca = estadoPeriodo(periodo);
                const contrato = contratoDe(periodo);
                return (
                  <tr key={periodo.id}>
                    <td><span className={`cd-estado cd-estado-${marca.clase}`}>{marca.texto}</span></td>
                    <td className="dato-clave">{nombrePeriodo(periodo)}</td>
                    <td>{direccionPropiedad(contrato.propiedades)}</td>
                    {!esInquilino && <td>{nombreInquilino(contrato.inquilinos)}</td>}
                    <td>{formatearFecha(periodo.fecha_vencimiento)}</td>
                    <td className="dato-clave">{formatearMonto(periodo.monto)}</td>
                    <td>{periodo.comprobantes_pago?.length || 0}</td>
                    <td className="ls-columna-acciones">
                      <div className="ls-botones">
                        <Button size="small" variant={puedeCargar(periodo) ? 'primary' : 'secondary'} onClick={() => setPeriodoId(periodo.id)}>
                          <Icon name={puedeCargar(periodo) ? 'clip' : 'eye'} size={15} />
                          {puedeCargar(periodo) ? 'Cargar' : 'Ver'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Paginacion {...paginacion} onChange={paginacion.setPagina} />
        </div>
      )}

      <Modal isOpen={Boolean(elegido)} onClose={() => setPeriodoId(null)} title="Detalle del Período" icon={<Icon name="receipt" size={22} />}>
        {elegido && <ComprobantesPortal periodo={elegido} puedeCargar={puedeCargar(elegido)} onCargado={recargar} />}
      </Modal>
    </>
  );
}

export function PortalPagos({ rol }) {
  const portal = usePortal(rol);
  const esInquilino = rol === ROL.INQUILINO;
  return (
    <PortalMarco
      {...portal}
      icono="receipt"
      titulo={esInquilino ? 'Mis Pagos' : 'Alquileres'}
      subtitulo={esInquilino ? 'Períodos de alquiler y comprobantes' : 'Estado de cobro de tus propiedades'}
    >
      {(datos) => <Tabla datos={datos} esInquilino={esInquilino} recargar={portal.recargar} />}
    </PortalMarco>
  );
}
