import { useEffect, useState } from 'react';
import {
  ESTADO_PROPIEDAD,
  ESTADO_PROPIEDAD_LABELS,
  TIPO_PROPIEDAD,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';
import { propietariosService } from '../../../services/propietariosService';
import { nombrePropietario } from '../../../services/propiedadesService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import * as filtro from '../../../shared/validaciones';
import '../../../shared/styles/forms.css';

const ESTADOS_MANUALES = [ESTADO_PROPIEDAD.DISPONIBLE, ESTADO_PROPIEDAD.MANTENIMIENTO];

const VACIO = {
  propietario_id: '',
  codigo: '',
  tipo: TIPO_PROPIEDAD.DEPARTAMENTO,
  estado: ESTADO_PROPIEDAD.DISPONIBLE,
  calle: '',
  numero: '',
  piso: '',
  departamento: '',
  localidad: '',
  provincia: '',
  codigo_postal: '',
  ambientes: '',
  superficie_m2: '',
  descripcion: '',
};

const FILTROS = {
  codigo: filtro.codigoInterno,
  calle: filtro.letrasYNumeros,
  numero: filtro.soloEnteros(6),
  piso: filtro.alfanumerico(3),
  departamento: filtro.alfanumerico(4),
  localidad: filtro.letrasYNumeros,
  provincia: filtro.soloLetras,
  codigo_postal: filtro.alfanumerico(8),
  ambientes: filtro.soloEnteros(2),
  superficie_m2: filtro.soloDecimal,
};

export function PropiedadForm({ propiedad, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(VACIO);
  const [propietarios, setPropietarios] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const tieneContratos = (propiedad?.contratos || []).length > 0;
  const estadoBloqueado = propiedad && !ESTADOS_MANUALES.includes(propiedad.estado);

  useEffect(() => {
    propietariosService.listar().then(setPropietarios).catch((err) => {
      setErrors({ submit: err.message });
    });
  }, []);

  useEffect(() => {
    if (!propiedad) {
      setFormData(VACIO);
      return;
    }
    setFormData({
      propietario_id: propiedad.propietario_id || '',
      codigo: propiedad.codigo || '',
      tipo: propiedad.tipo,
      estado: propiedad.estado,
      calle: propiedad.calle || '',
      numero: propiedad.numero || '',
      piso: propiedad.piso || '',
      departamento: propiedad.departamento || '',
      localidad: propiedad.localidad || '',
      provincia: propiedad.provincia || '',
      codigo_postal: propiedad.codigo_postal || '',
      ambientes: propiedad.ambientes ?? '',
      superficie_m2: propiedad.superficie_m2 ?? '',
      descripcion: propiedad.descripcion || '',
    });
  }, [propiedad]);

  const handleChange = (event) => {
    const { name } = event.target;
    const value = FILTROS[name] ? FILTROS[name](event.target.value) : event.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validar = () => {
    const next = {};
    if (!formData.calle.trim()) next.calle = 'La calle es obligatoria';
    if (!formData.numero.trim()) next.numero = 'El número es obligatorio';
    if (!formData.localidad.trim()) next.localidad = 'La localidad es obligatoria';
    // Hay localidades con números ("25 de Mayo"), pero no solo con números.
    else if (!/\p{L}/u.test(formData.localidad)) next.localidad = 'Ingresá el nombre de la localidad';
    if (!formData.provincia.trim()) next.provincia = 'La provincia es obligatoria';
    if (formData.ambientes && Number(formData.ambientes) <= 0) next.ambientes = 'Debe ser mayor a 0';
    if (formData.superficie_m2 && Number(formData.superficie_m2) <= 0) next.superficie_m2 = 'Debe ser mayor a 0';
    if (!propiedad && !ESTADOS_MANUALES.includes(formData.estado)) {
      next.estado = 'Al crear solo puede ser disponible o mantenimiento';
    }
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = validar();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const payload = {
      propietario_id: formData.propietario_id || null,
      codigo: formData.codigo.trim().toUpperCase() || null,
      tipo: formData.tipo,
      calle: formData.calle.trim(),
      numero: formData.numero.trim(),
      piso: formData.piso.trim() || null,
      departamento: formData.departamento.trim() || null,
      localidad: formData.localidad.trim(),
      provincia: formData.provincia.trim(),
      codigo_postal: formData.codigo_postal.trim() || null,
      ambientes: formData.ambientes === '' ? null : Number(formData.ambientes),
      superficie_m2: formData.superficie_m2 === '' ? null : Number(formData.superficie_m2),
      descripcion: formData.descripcion.trim() || null,
    };

    if (!estadoBloqueado) payload.estado = formData.estado;

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      const repetido = /duplicate key|unique/i.test(error.message);
      const mensaje = repetido ? 'Ya existe una propiedad con ese código o esa dirección.' : error.message;
      setErrors({ submit: mensaje, ...(error.campo && { [error.campo]: mensaje }) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.submit && <div className="form-error-global">{errors.submit}</div>}
      {tieneContratos && (
        <div className="form-warning">
          Esta propiedad tiene contratos. No se puede cambiar el tipo ni la dirección.
        </div>
      )}
      {estadoBloqueado && (
        <div className="form-warning">
          El estado {ESTADO_PROPIEDAD_LABELS[propiedad.estado]} lo define el contrato. No se edita a mano.
        </div>
      )}

      <div className="form-section">
        <p className="form-section-title">Identificación</p>

        <div className="form-group">
          <label htmlFor="propietario_id">Propietario</label>
          <select id="propietario_id" name="propietario_id" value={formData.propietario_id} onChange={handleChange}>
            <option value="">Sin asignar</option>
            {propietarios.map((propietario) => (
              <option key={propietario.id} value={propietario.id}>
                {nombrePropietario(propietario)} · {propietario.documento}
              </option>
            ))}
          </select>
          <p className="form-info">
            <Icon name="alert" size={16} />
            <span>El propietario es <strong>opcional</strong>: se puede asignar después.</span>
          </p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tipo">Tipo *</label>
            <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} disabled={tieneContratos}>
              {Object.values(TIPO_PROPIEDAD).map((tipo) => (
                <option key={tipo} value={tipo}>{TIPO_PROPIEDAD_LABELS[tipo]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="estado">Estado</label>
            {estadoBloqueado ? (
              <input value={ESTADO_PROPIEDAD_LABELS[formData.estado]} disabled />
            ) : (
              <select id="estado" name="estado" value={formData.estado} onChange={handleChange}>
                {ESTADOS_MANUALES.map((estado) => (
                  <option key={estado} value={estado}>{ESTADO_PROPIEDAD_LABELS[estado]}</option>
                ))}
              </select>
            )}
            {errors.estado && <span className="field-error">{errors.estado}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="codigo">Código interno</label>
          <input id="codigo" name="codigo" value={formData.codigo} onChange={handleChange} placeholder="Opcional, único. Ej: NC-1180" style={{ textTransform: formData.codigo ? 'uppercase' : 'none' }} />
          {errors.codigo && <span className="field-error">{errors.codigo}</span>}
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-title">Ubicación</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="calle">Calle *</label>
            <input id="calle" name="calle" value={formData.calle} onChange={handleChange} disabled={tieneContratos} />
            {errors.calle && <span className="field-error">{errors.calle}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="numero">Número *</label>
            <input id="numero" name="numero" inputMode="numeric" value={formData.numero} onChange={handleChange} disabled={tieneContratos} />
            {errors.numero && <span className="field-error">{errors.numero}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="piso">Piso</label>
            <input id="piso" name="piso" value={formData.piso} onChange={handleChange} disabled={tieneContratos} />
          </div>
          <div className="form-group">
            <label htmlFor="departamento">Departamento</label>
            <input id="departamento" name="departamento" value={formData.departamento} onChange={handleChange} disabled={tieneContratos} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="localidad">Localidad *</label>
            <input id="localidad" name="localidad" value={formData.localidad} onChange={handleChange} disabled={tieneContratos} />
            {errors.localidad && <span className="field-error">{errors.localidad}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="provincia">Provincia *</label>
            <input id="provincia" name="provincia" value={formData.provincia} onChange={handleChange} disabled={tieneContratos} />
            {errors.provincia && <span className="field-error">{errors.provincia}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="codigo_postal">Código postal</label>
          <input id="codigo_postal" name="codigo_postal" value={formData.codigo_postal} onChange={handleChange} disabled={tieneContratos} />
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-title">Características</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ambientes">Ambientes</label>
            <input id="ambientes" name="ambientes" inputMode="numeric" value={formData.ambientes} onChange={handleChange} />
            {errors.ambientes && <span className="field-error">{errors.ambientes}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="superficie_m2">Superficie (m²)</label>
            <input id="superficie_m2" name="superficie_m2" inputMode="decimal" value={formData.superficie_m2} onChange={handleChange} />
            {errors.superficie_m2 && <span className="field-error">{errors.superficie_m2}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea id="descripcion" name="descripcion" rows="3" value={formData.descripcion} onChange={handleChange} />
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant={propiedad ? 'primary' : 'success'} disabled={submitting}>{submitting ? 'Guardando...' : propiedad ? 'Guardar Cambios' : 'Crear Propiedad'}</Button>
      </div>
    </form>
  );
}
