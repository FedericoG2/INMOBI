import { TIPO_PERSONA_LABELS } from '../../../constants/estados';
import { nombreInquilino } from '../../../services/inquilinosService';
import { Button } from '../../../shared/components/Button';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { ContratosHistorial } from '../../contratos/components/ContratosHistorial';
import { ReclamosHistorial } from '../../reclamos/components/ReclamosHistorial';
import { reclamosDeContratos } from '../../reclamos/utils';
import '../../../shared/styles/listado.css';

export function InquilinoDetalle({ inquilino, onVerContrato, onEditar, onEliminar, onCerrar }) {
  const contratos = inquilino.contratos || [];
  const reclamos = reclamosDeContratos(contratos);

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`badge badge-${inquilino.tipo_persona}`}>{TIPO_PERSONA_LABELS[inquilino.tipo_persona]}</span>
        <span className={`estado-tag ${inquilino.usuario_id ? 'badge-disponible' : 'ls-neutro'}`}>
          {inquilino.usuario_id ? 'Portal habilitado' : 'Sin acceso al portal'}
        </span>
        <span className="cd-vigencia">
          <Icon name="user" size={16} />
          {nombreInquilino(inquilino)}
        </span>
      </div>

      <Tarjeta titulo="Identificación y contacto" icono={<Icon name="user" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta={inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'}>{inquilino.documento}</Dato>
          <Dato etiqueta="Email">{inquilino.email || '—'}</Dato>
          <Dato etiqueta="Teléfono">{inquilino.telefono || '—'}</Dato>
          <Dato etiqueta="Dirección">{inquilino.direccion || '—'}</Dato>
          <Dato etiqueta="Acceso al portal" ancho>
            {inquilino.usuario_id
              ? 'Habilitado.'
              : 'Sin acceso. Lo habilita el Administrador del sistema al crear la cuenta.'}
          </Dato>
          {inquilino.notas && <Dato etiqueta="Notas" ancho>{inquilino.notas}</Dato>}
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Historial de contratos" icono={<Icon name="file" size={18} />} contador={contratos.length}>
        <ContratosHistorial contratos={contratos} mostrar="propiedad" onVer={onVerContrato} />
      </Tarjeta>

      <Tarjeta titulo="Historial de reclamos" icono={<Icon name="alert" size={18} />} contador={reclamos.length}>
        <ReclamosHistorial contratos={contratos} mostrar="propiedad" />
      </Tarjeta>

      {contratos.length > 0 && (
        <div className="cd-info" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>Este inquilino no se puede eliminar por tener contratos asociados.</p>
        </div>
      )}

      <div className="cd-acciones ls-acciones">
        <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
        <Button variant="outline" onClick={onEditar}>
          <Icon name="edit" size={16} />
          Editar
        </Button>
        {contratos.length === 0 && (
          <Button variant="danger" onClick={onEliminar}>Eliminar inquilino</Button>
        )}
      </div>
    </div>
  );
}
