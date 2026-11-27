import { nombreInquilino } from '../../../services/inquilinosService';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { PortalMarco } from '../components/PortalMarco';
import { usePortal } from '../usePortal';

export function PortalPerfil({ rol }) {
  const portal = usePortal(rol);
  return (
    <PortalMarco {...portal} icono="user" titulo="Mi Perfil" subtitulo="Tus datos registrados en la inmobiliaria">
      {({ persona }) => (
        <div className="cd">
          <Tarjeta titulo="Datos personales" icono={<Icon name="user" size={18} />}>
            <dl className="cd-datos">
              <Dato etiqueta={persona.tipo_persona === 'juridica' ? 'Razón social' : 'Nombre'}>{nombreInquilino(persona)}</Dato>
              <Dato etiqueta={persona.tipo_persona === 'juridica' ? 'CUIT' : 'DNI / CUIL'}>{persona.documento}</Dato>
              <Dato etiqueta="Teléfono">{persona.telefono || '—'}</Dato>
              <Dato etiqueta="Correo electrónico">{persona.email || '—'}</Dato>
            </dl>
          </Tarjeta>
          <p className="portal-nota">
            <Icon name="alert" size={16} />
            Para modificar tus datos, comunicate con la inmobiliaria.
          </p>
        </div>
      )}
    </PortalMarco>
  );
}
