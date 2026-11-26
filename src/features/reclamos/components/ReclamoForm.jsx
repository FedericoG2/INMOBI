import { useState } from 'react';
import {
  CATEGORIA_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO,
  PRIORIDAD_RECLAMO_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { reclamosService } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { SelectBuscable } from '../../../shared/components/SelectBuscable';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import '../../../shared/styles/forms.css';

const MAX_IMAGENES = 5;

// Sirve para registrar (con contrato e imágenes) y para editar (solo los datos del reclamo).
export function ReclamoForm({ reclamo = null, contratos = [], onGuardado, onCancelar }) {
  const esEdicion = Boolean(reclamo);
  const [inquilinoId, setInquilinoId] = useState('');
  const [contratoId, setContratoId] = useState(reclamo?.contrato_id || '');
  const [titulo, setTitulo] = useState(reclamo?.titulo || '');
  const [descripcion, setDescripcion] = useState(reclamo?.descripcion || '');
  const [categoria, setCategoria] = useState(reclamo?.categoria || '');
  const [prioridad, setPrioridad] = useState(reclamo?.prioridad || PRIORIDAD_RECLAMO.MEDIA);
  const [archivos, setArchivos] = useState([]);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Un inquilino puede tener varios contratos activos: se elige primero la persona y después la propiedad.
  const opcionesInquilino = [...new Map(contratos.map((contrato) => [contrato.inquilino_id, contrato.inquilinos])).entries()]
    .map(([id, inquilino]) => ({
      value: id,
      label: nombreInquilino(inquilino),
      sublabel: inquilino?.documento,
      icono: <Icon name="user" size={16} />,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  const opcionesPropiedad = contratos
    .filter((contrato) => contrato.inquilino_id === inquilinoId)
    .map((contrato) => ({
      value: contrato.id,
      label: direccionPropiedad(contrato.propiedades),
      meta: contrato.propiedades?.codigo,
      icono: <Icon name="building" size={16} />,
    }));
  const opcionesCategoria = Object.entries(CATEGORIA_RECLAMO_LABELS).map(([value, label]) => ({ value, label }));
  const sinContratos = !esEdicion && contratos.length === 0;

  function limpiarError(campo) {
    if (errores[campo]) setErrores((actual) => ({ ...actual, [campo]: null }));
  }

  function elegirInquilino(id) {
    const suyos = contratos.filter((contrato) => contrato.inquilino_id === id);
    setInquilinoId(id);
    // Con una sola propiedad alquilada no hay nada que elegir.
    setContratoId(suyos.length === 1 ? suyos[0].id : '');
    setErrores((actual) => ({ ...actual, inquilino: null, contrato: null }));
  }

  function elegirArchivos(lista) {
    const imagenes = lista.filter((archivo) => archivo.type.startsWith('image/'));
    setErrores((actual) => ({
      ...actual,
      archivos: imagenes.length < lista.length ? 'Solo se pueden adjuntar imágenes.' : null,
    }));
    setArchivos(imagenes);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nuevos = {};
    if (!esEdicion && !inquilinoId) nuevos.inquilino = 'Elegí el inquilino';
    else if (!esEdicion && !contratoId) nuevos.contrato = 'Elegí la propiedad';
    if (!titulo.trim()) nuevos.titulo = 'El título es obligatorio';
    if (!descripcion.trim()) nuevos.descripcion = 'La descripción es obligatoria';
    if (!categoria) nuevos.categoria = 'Elegí la categoría';
    if (Object.keys(nuevos).length > 0) {
      setErrores(nuevos);
      setErrorGeneral('Completá los campos marcados.');
      return;
    }

    setGuardando(true);
    setErrorGeneral(null);
    try {
      const datos = { titulo, descripcion, categoria, prioridad };
      if (esEdicion) {
        await reclamosService.actualizar(reclamo.id, datos);
        await onGuardado();
        return;
      }

      const creado = await reclamosService.crear({ contratoId, ...datos });
      let avisoImagenes = null;
      if (archivos.length > 0) {
        try {
          await reclamosService.subirImagenes(creado.id, archivos, 0);
        } catch (err) {
          // El reclamo ya quedó registrado: se avisa para no cargarlo dos veces.
          avisoImagenes = err.message;
        }
      }
      await onGuardado({ avisoImagenes });
    } catch (err) {
      setErrorGeneral(err.message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorGeneral && <div className="form-error-global">{errorGeneral}</div>}
      {sinContratos && (
        <div className="form-aviso">No hay contratos activos. Un reclamo solo se registra sobre un contrato activo.</div>
      )}

      {!esEdicion && (
        <div className="form-section">
          <p className="form-section-title">Inquilino y propiedad</p>
          <div className="form-group">
            <label htmlFor="inquilino_reclamo">Inquilino *</label>
            <SelectBuscable
              id="inquilino_reclamo"
              value={inquilinoId}
              onChange={elegirInquilino}
              opciones={opcionesInquilino}
              placeholder="Seleccionar..."
              placeholderBusqueda="Buscar por nombre o documento..."
              disabled={guardando || sinContratos}
              error={Boolean(errores.inquilino)}
            />
            <p className="form-info">
              <Icon name="alert" size={16} />
              <span>Solo aparecen los inquilinos con un <strong>contrato activo</strong>.</span>
            </p>
            {errores.inquilino && <span className="field-error">{errores.inquilino}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="contrato_reclamo">Propiedad *</label>
            <SelectBuscable
              id="contrato_reclamo"
              value={contratoId}
              onChange={(valor) => { setContratoId(valor); limpiarError('contrato'); }}
              opciones={opcionesPropiedad}
              placeholder={inquilinoId ? 'Seleccionar...' : 'Primero elegí el inquilino'}
              placeholderBusqueda="Buscar por dirección o código..."
              disabled={guardando || !inquilinoId}
              error={Boolean(errores.contrato)}
            />
            {errores.contrato && <span className="field-error">{errores.contrato}</span>}
          </div>
        </div>
      )}

      <div className="form-section">
        <p className="form-section-title">Detalle del reclamo</p>

        <div className="form-group">
          <label htmlFor="titulo_reclamo">Título *</label>
          <input
            id="titulo_reclamo"
            value={titulo}
            maxLength={120}
            placeholder="Ej: Pérdida de agua en la cocina"
            onChange={(event) => { setTitulo(event.target.value); limpiarError('titulo'); }}
            disabled={guardando}
          />
          {errores.titulo && <span className="field-error">{errores.titulo}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="descripcion_reclamo">Descripción *</label>
          <textarea
            id="descripcion_reclamo"
            rows="3"
            value={descripcion}
            placeholder="Qué pasa, desde cuándo y en qué parte del inmueble"
            onChange={(event) => { setDescripcion(event.target.value); limpiarError('descripcion'); }}
            disabled={guardando}
          />
          {errores.descripcion && <span className="field-error">{errores.descripcion}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="categoria_reclamo">Categoría *</label>
            <SelectBuscable
              id="categoria_reclamo"
              value={categoria}
              onChange={(valor) => { setCategoria(valor); limpiarError('categoria'); }}
              opciones={opcionesCategoria}
              placeholder="Elegí la categoría"
              buscable={false}
              disabled={guardando}
              error={Boolean(errores.categoria)}
            />
            {errores.categoria && <span className="field-error">{errores.categoria}</span>}
          </div>
          <div className="form-group">
            <label>Prioridad *</label>
            <div className="radio-group">
              {Object.entries(PRIORIDAD_RECLAMO_LABELS).map(([valor, etiqueta]) => (
                <label className="radio-label" key={valor}>
                  <input
                    type="radio"
                    name="prioridad_reclamo"
                    value={valor}
                    checked={prioridad === valor}
                    onChange={() => setPrioridad(valor)}
                    disabled={guardando}
                  />
                  <span>{etiqueta}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!esEdicion && (
        <div className="form-section">
          <p className="form-section-title">Imágenes de respaldo</p>
          <div className="form-group">
            <label htmlFor="imagenes_reclamo">Opcional, hasta {MAX_IMAGENES}</label>
            <SubirArchivos
              id="imagenes_reclamo"
              value={archivos}
              onChange={elegirArchivos}
              multiple
              max={MAX_IMAGENES}
              accept="image/*"
              disabled={guardando}
            />
            {errores.archivos && <span className="field-error">{errores.archivos}</span>}
          </div>
        </div>
      )}

      <div className="form-actions form-actions-sticky">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
        <Button type="submit" variant={esEdicion ? 'primary' : 'success'} disabled={guardando || sinContratos}>
          {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Registrar Reclamo'}
        </Button>
      </div>
    </form>
  );
}
