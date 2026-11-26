import {
  ESTADO_PROPIEDAD_LABELS,
  TIPO_PERSONA_LABELS,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad, nombrePropietario } from '../../../services/propiedadesService';
import { Button } from '../../../shared/components/Button';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import '../../../shared/styles/listado.css';

export function PropietarioDetalle({ propietario, onEditar, onEliminar, onCerrar }) {
  const propiedades = propietario.propiedades || [];

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`badge badge-${propietario.tipo_persona}`}>{TIPO_PERSONA_LABELS[propietario.tipo_persona]}</span>
        <span className="cd-vigencia">
          <Icon name="user" size={16} />
          {nombrePropietario(propietario)}
        </span>
      </div>

      <Tarjeta titulo="Identificación y contacto" icono={<Icon name="user" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta={propietario.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'}>{propietario.documento}</Dato>
          <Dato etiqueta="Email">{propietario.email || '—'}</Dato>
          <Dato etiqueta="Teléfono">{propietario.telefono || '—'}</Dato>
          <Dato etiqueta="Dirección">{propietario.direccion || '—'}</Dato>
          {propietario.notas && <Dato etiqueta="Notas" ancho>{propietario.notas}</Dato>}
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Propiedades" icono={<Icon name="building" size={18} />} contador={propiedades.length}>
        {propiedades.length === 0 ? (
          <p className="cd-vacio">Todavía no tiene propiedades asociadas.</p>
        ) : (
          <div className="cd-tabla-contenedor">
            <table className="cd-tabla">
              <thead>
                <tr><th>Estado</th><th>Propiedad</th><th>Tipo</th></tr>
              </thead>
              <tbody>
                {propiedades.map((propiedad) => (
                  <tr key={propiedad.id}>
                    <td>
                      <span className={`estado-tag badge-${propiedad.estado}`}>{ESTADO_PROPIEDAD_LABELS[propiedad.estado]}</span>
                    </td>
                    <td>
                      {propiedad.codigo && <><strong className="ls-codigo">{propiedad.codigo}</strong> - </>}
                      {direccionPropiedad(propiedad)}
                    </td>
                    <td>{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {propiedades.length > 0 && (
        <div className="cd-info" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>Este propietario no se puede eliminar por tener propiedades asociadas.</p>
        </div>
      )}

      <div className="cd-acciones ls-acciones">
        <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
        <Button variant="outline" onClick={onEditar}>
          <Icon name="edit" size={16} />
          Editar
        </Button>
        {propiedades.length === 0 && (
          <Button variant="danger" onClick={onEliminar}>Eliminar propietario</Button>
        )}
      </div>
    </div>
  );
}
