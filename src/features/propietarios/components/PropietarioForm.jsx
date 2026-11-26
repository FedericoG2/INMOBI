import { PersonaForm } from '../../../shared/components/PersonaForm';

export function PropietarioForm({ propietario, onSubmit, onCancel, tienePropiedades = false }) {
  return (
    <PersonaForm
      key={propietario?.id || 'nuevo'}
      entidad="propietario"
      persona={propietario}
      bloqueado={Boolean(propietario) && tienePropiedades}
      motivoBloqueo="Tiene propiedades asociadas: no se puede cambiar el tipo de persona ni el documento."
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
