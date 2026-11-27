import { useState } from 'react';
import { CATEGORIA_RECLAMO_LABELS, ESTADO_RECLAMO_LABELS, ROL } from '../../../constants/estados';
import { direccionPropiedad } from '../../../services/contratosService';
import { formatearFechaHora } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import { PortalMarco } from '../components/PortalMarco';
import { ReclamoPortalDetalle } from '../components/ReclamoPortalDetalle';
import { ReclamoPortalForm } from '../components/ReclamoPortalForm';
import { usePortal } from '../usePortal';
import '../../reclamos/components/ReclamoDetalle.css';

export function PortalReclamos() {
  const portal = usePortal(ROL.INQUILINO);
  const [ventana, setVentana] = useState(null); // { tipo: 'nuevo' | 'ver' | 'editar', id }
  const toast = useToast();
  const reclamos = portal.datos?.reclamos || [];
  const contratos = portal.datos?.contratos || [];
  const activos = contratos.filter((contrato) => contrato.estado === 'activo');
  const paginacion = usePaginacion(reclamos);
  const elegido = reclamos.find((reclamo) => reclamo.id === ventana?.id) || null;
  const direccion = (id) => {
    const contrato = contratos.find((item) => item.id === id);
    return contrato ? direccionPropiedad(contrato.propiedades) : '—';
  };

  async function guardado(mensaje) {
    await portal.recargar();
    setVentana(null);
    toast.success(mensaje);
  }

  return (
    <PortalMarco
      {...portal}
      icono="alert"
      titulo="Reclamos"
      subtitulo="Registrá un problema y seguí su avance"
      accion={activos.length > 0 && <Button variant="success" onClick={() => setVentana({ tipo: 'nuevo' })}>Nuevo reclamo</Button>}
    >
      {() => (
        <>
          {reclamos.length === 0 ? (
            <div className="page-empty"><p>{activos.length ? 'Todavía no registraste reclamos.' : 'Necesitás un contrato activo para registrar reclamos.'}</p></div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Estado</th><th>Reclamo</th><th>Categoría</th><th>Propiedad</th><th>Fecha</th><th className="ls-columna-acciones">Acciones</th></tr>
                </thead>
                <tbody>
                  {paginacion.visibles.map((reclamo) => (
                    <tr key={reclamo.id}>
                      <td><span className={`estado-tag rc-estado-${reclamo.estado}`}>{ESTADO_RECLAMO_LABELS[reclamo.estado]}</span></td>
                      <td className="dato-clave">{reclamo.titulo}</td>
                      <td>{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]}</td>
                      <td>{direccion(reclamo.contrato_id)}</td>
                      <td>{formatearFechaHora(reclamo.creado_en).split(',')[0]}</td>
                      <td className="ls-columna-acciones">
                        <div className="ls-botones">
                          <Button size="small" variant="secondary" onClick={() => setVentana({ tipo: 'ver', id: reclamo.id })}>
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
          )}

          <Modal isOpen={ventana?.tipo === 'nuevo' || ventana?.tipo === 'editar'} onClose={() => setVentana(null)} title={ventana?.tipo === 'editar' ? 'Editar Reclamo' : 'Nuevo Reclamo'} icon={<Icon name="alert" size={22} />} size="large" tall>
            {(ventana?.tipo === 'nuevo' || ventana?.tipo === 'editar') && (
              <ReclamoPortalForm reclamo={ventana.tipo === 'editar' ? elegido : null} contratos={activos} onGuardado={guardado} onCancelar={() => setVentana(null)} />
            )}
          </Modal>

          <Modal isOpen={ventana?.tipo === 'ver' && Boolean(elegido)} onClose={() => setVentana(null)} title="Detalle del Reclamo" icon={<Icon name="alert" size={22} />} size="large" tall>
            {ventana?.tipo === 'ver' && elegido && (
              <ReclamoPortalDetalle
                reclamo={elegido}
                onEditar={() => setVentana({ tipo: 'editar', id: elegido.id })}
                onEliminado={async () => { setVentana(null); await portal.recargar(); }}
              />
            )}
          </Modal>
        </>
      )}
    </PortalMarco>
  );
}
