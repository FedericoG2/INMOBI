import { useCallback, useEffect, useState } from 'react';
import {
  CATEGORIA_RECLAMO_LABELS,
  ESTADO_RECLAMO,
  ESTADO_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO_LABELS,
} from '../../../constants/estados';
import { formatearFechaHora, reclamosService } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import { useToast } from '../../../shared/components/Toast';
import { separarObservacion } from '../../reclamos/utils';
import '../../reclamos/components/ReclamoDetalle.css';

const MAX_IMAGENES = 5;

// Seguimiento de un reclamo propio. Solo mientras está pendiente se edita o elimina.
export function ReclamoPortalDetalle({ reclamo, onEditar, onEliminado }) {
  const [eventos, setEventos] = useState([]);
  const [imagenes, setImagenes] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const toast = useToast();
  const pendiente = reclamo.estado === ESTADO_RECLAMO.PENDIENTE;
  const resuelto = reclamo.estado === ESTADO_RECLAMO.RESUELTO;

  const cargar = useCallback(async () => {
    try {
      const [historial, adjuntas] = await Promise.all([
        reclamosService.listarEventos(reclamo.id),
        reclamosService.listarImagenes(reclamo.id),
      ]);
      const conVista = await Promise.all(adjuntas.map(async (imagen) => {
        const vista = await reclamosService.descargarImagen(imagen.ruta_storage)
          .then((archivo) => URL.createObjectURL(archivo))
          .catch(() => null);
        return { ...imagen, vista };
      }));
      setEventos(historial);
      setImagenes(conVista);
    } catch (err) {
      toast.error(err.message);
    }
    // toast cambia en cada dibujado y no tiene que volver a cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reclamo.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function adjuntar(archivos) {
    if (archivos.length === 0) return;
    setProcesando(true);
    try {
      await reclamosService.subirImagenes(reclamo.id, archivos, imagenes.length);
      toast.success('Imagen adjuntada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      await cargar();
      setProcesando(false);
    }
  }

  async function eliminar() {
    setProcesando(true);
    try {
      await reclamosService.eliminar(reclamo.id);
      toast.success('Reclamo eliminado');
      await onEliminado();
    } catch (err) {
      toast.error(err.message);
      setProcesando(false);
      setConfirmarBorrado(false);
    }
  }

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`estado-tag rc-estado-${reclamo.estado}`}>{ESTADO_RECLAMO_LABELS[reclamo.estado]}</span>
        <span className={`estado-tag rc-prioridad-${reclamo.prioridad}`}>Prioridad {PRIORIDAD_RECLAMO_LABELS[reclamo.prioridad].toLowerCase()}</span>
      </div>

      <Tarjeta titulo="Reclamo" icono={<Icon name="alert" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta="Título">{reclamo.titulo}</Dato>
          <Dato etiqueta="Categoría">{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]}</Dato>
          <Dato etiqueta="Descripción" ancho>{reclamo.descripcion}</Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Imágenes" icono={<Icon name="clip" size={18} />} contador={`${imagenes.length}/${MAX_IMAGENES}`}>
        {imagenes.length === 0 ? <p className="cd-vacio">No hay imágenes adjuntas.</p> : (
          <ul className="rc-imagenes">
            {imagenes.map((imagen) => (
              <li key={imagen.id}>
                {imagen.vista
                  ? <a href={imagen.vista} target="_blank" rel="noreferrer"><img src={imagen.vista} alt={imagen.nombre_archivo} /></a>
                  : <span className="rc-sin-vista">Sin vista previa</span>}
                <div><small title={imagen.nombre_archivo}>{imagen.nombre_archivo}</small></div>
              </li>
            ))}
          </ul>
        )}
        {!resuelto && imagenes.length < MAX_IMAGENES && (
          <div className="rc-adjuntar">
            <SubirArchivos value={[]} onChange={adjuntar} multiple max={MAX_IMAGENES - imagenes.length} mostrarContador={false} accept="image/*" disabled={procesando} />
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Seguimiento" icono={<Icon name="trend" size={18} />}>
        <ol className="rc-linea">
          {[...eventos].reverse().map((evento) => {
            const { texto } = separarObservacion(evento.observacion);
            return (
              <li key={evento.id}>
                <span className={`rc-punto rc-estado-${evento.estado_nuevo}`} aria-hidden="true" />
                <div className="rc-evento">
                  <div className="rc-evento-titulo">
                    <span className="rc-evento-nombre">
                      <strong>{evento.estado_anterior === evento.estado_nuevo ? 'Avance' : ESTADO_RECLAMO_LABELS[evento.estado_nuevo]}</strong>
                    </span>
                    <time>{formatearFechaHora(evento.creado_en)}</time>
                  </div>
                  {texto && <p>{texto}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </Tarjeta>

      {pendiente && (
        <div className="cd-acciones rc-acciones">
          <Button variant="danger" onClick={() => setConfirmarBorrado(true)} disabled={procesando}>Eliminar Reclamo</Button>
          <Button onClick={onEditar} disabled={procesando}>Editar Reclamo</Button>
        </div>
      )}
      {!pendiente && <p className="portal-nota"><Icon name="alert" size={16} />La inmobiliaria ya tomó este reclamo: no se puede editar ni eliminar.</p>}

      <ConfirmDialog
        isOpen={confirmarBorrado}
        title="Eliminar Reclamo"
        message={`Vas a eliminar el reclamo "${reclamo.titulo}".`}
        warning="Esta acción no se puede deshacer."
        confirmLabel="Eliminar Reclamo"
        cancelLabel="Volver"
        busy={procesando}
        onConfirm={eliminar}
        onCancel={() => setConfirmarBorrado(false)}
      />
    </div>
  );
}
