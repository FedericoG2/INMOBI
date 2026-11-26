import { useState } from 'react';
import { TIPO_PERSONA, TIPO_PERSONA_LABELS } from '../../constants/estados';
import { Button } from './Button';
import { Icon } from './Icons';
import * as filtro from '../validaciones';
import '../styles/forms.css';

const CAMPOS = ['documento', 'nombre', 'apellido', 'razon_social', 'email', 'telefono', 'direccion', 'notas'];

const FILTROS = {
  documento: filtro.documento,
  nombre: filtro.soloLetras,
  apellido: filtro.soloLetras,
  email: filtro.sinEspacios,
  telefono: filtro.telefono,
};

// El documento se guarda solo con números: se admiten puntos, guiones y espacios al escribirlo.
function soloNumeros(documento) {
  return documento.replace(/[.\-\s]/g, '');
}

function errorDocumento(tipo, documento) {
  if (!documento.trim()) return 'El documento es obligatorio';
  const numero = soloNumeros(documento);
  if (tipo === TIPO_PERSONA.JURIDICA) {
    return /^\d{11}$/.test(numero) ? null : 'El CUIT tiene 11 números';
  }
  return /^(\d{7,8}|\d{11})$/.test(numero) ? null : 'Ingresá un DNI (7 u 8 números) o un CUIL (11 números)';
}

function errorTelefono(telefono) {
  const valor = telefono.trim();
  if (!valor) return null;
  if (!/^[\d+\-\s]+$/.test(valor)) return 'Usá solo números, espacios, + y -';
  return valor.replace(/\D/g, '').length >= 6 ? null : 'El teléfono es demasiado corto';
}

// Formulario de alta y edición compartido por propietarios e inquilinos.
export function PersonaForm({ entidad, persona = null, bloqueado = false, motivoBloqueo, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(() => ({
    tipo_persona: persona?.tipo_persona || TIPO_PERSONA.FISICA,
    ...Object.fromEntries(CAMPOS.map((campo) => [campo, persona?.[campo] || ''])),
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const esFisica = formData.tipo_persona === TIPO_PERSONA.FISICA;
  const nombreEntidad = entidad === 'propietario' ? 'Propietario' : 'Inquilino';

  function handleChange(event) {
    const { name } = event.target;
    const value = FILTROS[name] ? FILTROS[name](event.target.value) : event.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Al cambiar el tipo de persona los errores anteriores dejan de aplicar.
    if (name === 'tipo_persona') setErrors({});
    else if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  }

  function validar() {
    const next = {};
    const documento = bloqueado ? null : errorDocumento(formData.tipo_persona, formData.documento);
    if (documento) next.documento = documento;
    if (esFisica) {
      if (!formData.nombre.trim()) next.nombre = 'El nombre es obligatorio';
      if (!formData.apellido.trim()) next.apellido = 'El apellido es obligatorio';
    } else if (!formData.razon_social.trim()) {
      next.razon_social = 'La razón social es obligatoria';
    }
    if (!formData.email.trim()) next.email = 'El email es obligatorio';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) next.email = 'Ingresá un email válido';
    const telefono = errorTelefono(formData.telefono);
    if (telefono) next.telefono = telefono;
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = validar();
    if (Object.keys(next).length > 0) {
      setErrors({ ...next, submit: 'Revisá los campos marcados.' });
      return;
    }

    const limpio = (campo) => formData[campo].trim() || null;
    const datos = {
      tipo_persona: formData.tipo_persona,
      // Si la identidad está bloqueada se envía tal cual está guardada.
      documento: bloqueado ? persona.documento : soloNumeros(formData.documento),
      nombre: esFisica ? limpio('nombre') : null,
      apellido: esFisica ? limpio('apellido') : null,
      razon_social: esFisica ? null : limpio('razon_social'),
      email: formData.email.trim().toLowerCase(),
      telefono: limpio('telefono'),
      direccion: limpio('direccion'),
      notas: limpio('notas'),
    };

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(datos);
    } catch (error) {
      // El control previo indica el campo; la base cubre dos altas simultáneas.
      const repetido = /duplicate key|unique/i.test(error.message);
      const documento = error.campo === 'documento' ? error.message : repetido ? `Ya existe un ${entidad} con ese documento` : null;
      setErrors(documento
        ? { documento, submit: 'Revisá los campos marcados.' }
        : { submit: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  // Función y no componente, para que los inputs no pierdan el foco al escribir.
  const campo = (name, etiqueta, props = {}) => (
    <div className="form-group">
      <label htmlFor={name}>{etiqueta}</label>
      <input
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        className={errors[name] ? 'input-error' : ''}
        {...props}
      />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errors.submit && <div className="form-error-global">{errors.submit}</div>}

      <div className="form-section">
        <p className="form-section-title">Identificación</p>

        {bloqueado && (
          <p className="form-info">
            <Icon name="alert" size={16} />
            <span>{motivoBloqueo}</span>
          </p>
        )}

        <div className="form-group">
          <label>Tipo de persona *</label>
          <div className="radio-group">
            {Object.values(TIPO_PERSONA).map((tipo) => (
              <label className="radio-label" key={tipo}>
                <input
                  type="radio"
                  name="tipo_persona"
                  value={tipo}
                  checked={formData.tipo_persona === tipo}
                  onChange={handleChange}
                  disabled={bloqueado}
                />
                <span>{TIPO_PERSONA_LABELS[tipo]}</span>
              </label>
            ))}
          </div>
        </div>

        {campo('documento', esFisica ? 'DNI / CUIL *' : 'CUIT *', {
          placeholder: esFisica ? 'Ej: 30123456' : 'Ej: 30712345678',
          inputMode: 'numeric',
          maxLength: 15,
          disabled: bloqueado,
        })}

        {esFisica ? (
          <div className="form-row">
            {campo('nombre', 'Nombre *', { placeholder: 'Ej: María Laura' })}
            {campo('apellido', 'Apellido *', { placeholder: 'Ej: Gómez' })}
          </div>
        ) : campo('razon_social', 'Razón social *', { placeholder: 'Ej: Inversiones del Centro S.R.L.' })}
      </div>

      <div className="form-section">
        <p className="form-section-title">Contacto</p>

        <div className="form-row">
          {campo('email', 'Email *', { type: 'email', placeholder: 'nombre@correo.com' })}
          {campo('telefono', 'Teléfono', { type: 'tel', placeholder: 'Ej: 351 555-0101', maxLength: 25 })}
        </div>

        {campo('direccion', 'Dirección', { placeholder: 'Ej: Av. Colón 1234, Córdoba' })}
      </div>

      <div className="form-section">
        <p className="form-section-title">Observaciones</p>

        <div className="form-group">
          <label htmlFor="notas">Opcional</label>
          <textarea
            id="notas"
            name="notas"
            rows="3"
            value={formData.notas}
            placeholder="Datos útiles, como horarios de contacto"
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-actions form-actions-sticky">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button type="submit" variant={persona ? 'primary' : 'success'} disabled={submitting}>
          {submitting ? 'Guardando...' : persona ? 'Guardar Cambios' : `Crear ${nombreEntidad}`}
        </Button>
      </div>
    </form>
  );
}
