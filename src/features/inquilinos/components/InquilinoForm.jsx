import { PersonaForm } from '../../../shared/components/PersonaForm';

export function InquilinoForm({ inquilino, onSubmit, onCancel }) {
  return (
    <PersonaForm
      key={inquilino?.id || 'nuevo'}
      entidad="inquilino"
      persona={inquilino}
      bloqueado={(inquilino?.contratos || []).length > 0}
      motivoBloqueo="Tiene contratos: no se puede cambiar el tipo de persona ni el documento."
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
