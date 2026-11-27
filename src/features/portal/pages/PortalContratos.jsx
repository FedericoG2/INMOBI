import { useState } from 'react';
import { ESTADO_CONTRATO_LABELS, ROL } from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { formatearFecha, formatearMonto } from '../../propiedades/utils';
import { ContratoPortal } from '../components/ContratoPortal';
import { PortalMarco } from '../components/PortalMarco';
import { usePortal } from '../usePortal';

function Tabla({ datos, esPropietario }) {
  const [elegido, setElegido] = useState(null);
  const paginacion = usePaginacion(datos.contratos);

  if (datos.contratos.length === 0) return <div className="page-empty"><p>No hay contratos para mostrar.</p></div>;

  return (
    <>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Estado</th><th>Propiedad</th>{esPropietario && <th>Inquilino</th>}<th>Vigencia</th><th>Alquiler mensual</th>
              <th className="ls-columna-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginacion.visibles.map((contrato) => (
              <tr key={contrato.id}>
                <td><span className={`estado-tag estado-${contrato.estado}`}>{ESTADO_CONTRATO_LABELS[contrato.estado]}</span></td>
                <td className="dato-clave">{direccionPropiedad(contrato.propiedades)}</td>
                {esPropietario && <td>{nombreInquilino(contrato.inquilinos)}</td>}
                <td>{formatearFecha(contrato.fecha_inicio)} → {formatearFecha(contrato.fecha_fin)}</td>
                <td className="dato-clave">{formatearMonto(contrato.monto_actual)}</td>
                <td className="ls-columna-acciones">
                  <div className="ls-botones">
                    <Button size="small" variant="secondary" onClick={() => setElegido(contrato)}>
                      <Icon name="eye" size={15} /> Ver detalle
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacion {...paginacion} onChange={paginacion.setPagina} />
      </div>

      <Modal isOpen={Boolean(elegido)} onClose={() => setElegido(null)} title="Detalle del Contrato" icon={<Icon name="file" size={22} />} size="large" tall>
        {elegido && <ContratoPortal contrato={elegido} aumentos={datos.aumentos} documentos={datos.documentos} mostrarInquilino={esPropietario} />}
      </Modal>
    </>
  );
}

export function PortalContratos({ rol }) {
  const portal = usePortal(rol);
  const esPropietario = rol === ROL.PROPIETARIO;
  return (
    <PortalMarco {...portal} icono="file" titulo={esPropietario ? 'Contratos' : 'Mis Contratos'} subtitulo="Condiciones, aumentos y documentación">
      {(datos) => <Tabla datos={datos} esPropietario={esPropietario} />}
    </PortalMarco>
  );
}
