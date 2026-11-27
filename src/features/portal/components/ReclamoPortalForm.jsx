import { useState } from 'react';
import {
  CATEGORIA_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO,
  PRIORIDAD_RECLAMO_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad } from '../../../services/contratosService';
import { reclamosService } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import '../../../shared/styles/forms.css';

const MAX_IMAGENES = 5;

// Alta (sobre un contrato activo) y edición de un reclamo pendiente del inquilino.
export function ReclamoPortalForm({ reclamo = null, contratos = [], onGuardado, onCancelar }) {
  const [datos, setDatos] = useState(() => ({
    contratoId: reclamo?.contrato_id || (contratos.length === 1 ? contratos[0].id : ''),
    titulo: reclamo?.titulo || '',
    descripcion: reclamo?.descripcion || '',
    categoria: reclamo?.categoria || '',
    prioridad: reclamo?.prioridad || PRIORIDAD_RECLAMO.MEDIA,
  }));
  const [imagenes, setImagenes] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (event) => setDatos((actual) => ({ ...actual, [campo]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!datos.contratoId || !datos.titulo.trim() || !datos.descripcion.trim() || !datos.categoria) {
      setError('Completá todos los campos obligatorios (*).');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (reclamo) {
        await reclamosService.actualizar(reclamo.id, datos);
        await onGuardado('Reclamo actualizado');
        return;
      }
      const creado = await reclamosService.crear(datos);
      let aviso = 'Reclamo registrado';
      if (imagenes.length > 0) {
        try {
          await reclamosService.subirImagenes(creado.id, imagenes, 0);
        } catch (err) {
          aviso = `El reclamo quedó registrado, pero falló una imagen: ${err.message}`;
        }
      }
      await onGuardado(aviso);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="form-error-global">{error}</div>}
      <div className="form-section">
        {!reclamo && (
          <div className="form-group">
            <label htmlFor="portal_contrato">Propiedad *</label>
            <select id="portal_contrato" value={datos.contratoId} onChange={cambiar('contratoId')} disabled={guardando}>
              <option value="">Seleccionar...</option>
              {contratos.map((contrato) => (
                <option key={contrato.id} value={contrato.id}>{direccionPropiedad(contrato.propiedades)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="portal_titulo">Título *</label>
          <input id="portal_titulo" value={datos.titulo} maxLength={120} placeholder="Ej: Pérdida de agua en la cocina" onChange={cambiar('titulo')} disabled={guardando} />
        </div>
        <div className="form-group">
          <label htmlFor="portal_descripcion">Descripción *</label>
          <textarea id="portal_descripcion" rows="3" value={datos.descripcion} placeholder="Qué pasa, desde cuándo y dónde" onChange={cambiar('descripcion')} disabled={guardando} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="portal_categoria">Categoría *</label>
            <select id="portal_categoria" value={datos.categoria} onChange={cambiar('categoria')} disabled={guardando}>
              <option value="">Seleccionar...</option>
              {Object.entries(CATEGORIA_RECLAMO_LABELS).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="portal_prioridad">Prioridad *</label>
            <select id="portal_prioridad" value={datos.prioridad} onChange={cambiar('prioridad')} disabled={guardando}>
              {Object.entries(PRIORIDAD_RECLAMO_LABELS).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </div>
        </div>
        {!reclamo && (
          <div className="form-group">
            <label>Imágenes (opcional, hasta {MAX_IMAGENES})</label>
            <SubirArchivos value={imagenes} onChange={setImagenes} multiple max={MAX_IMAGENES} accept="image/*" disabled={guardando} />
          </div>
        )}
      </div>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" variant={reclamo ? 'primary' : 'success'} disabled={guardando}>
          {guardando ? 'Guardando...' : reclamo ? 'Guardar Cambios' : 'Registrar Reclamo'}
        </Button>
      </div>
    </form>
  );
}
