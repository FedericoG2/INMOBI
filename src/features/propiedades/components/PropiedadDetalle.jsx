import {
  CATEGORIA_RECLAMO_LABELS,
  ESTADO_CONTRATO_LABELS,
  ESTADO_PROPIEDAD_LABELS,
  ESTADO_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO_LABELS,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';
import { nombreInquilino } from '../../../services/contratosService';
import { direccionPropiedad, nombrePropietario } from '../../../services/propiedadesService';
import { Button } from '../../../shared/components/Button';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { contratoVigente, formatearFecha, formatearMonto, ordenarContratos } from '../utils';

export function PropiedadDetalle({ propiedad, onVerContrato, onEditar, onEliminar, onCerrar }) {
  const vigente = contratoVigente(propiedad);
  const contratos = ordenarContratos(propiedad.contratos);
  // Reclamos de todos los contratos, vigentes y cerrados.
  const reclamos = contratos
    .flatMap((contrato) => (contrato.reclamos || []).map((reclamo) => ({ ...reclamo, contrato })))
    .sort((a, b) => String(b.creado_en || '').localeCompare(String(a.creado_en || '')));

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`estado-tag badge-${propiedad.estado}`}>{ESTADO_PROPIEDAD_LABELS[propiedad.estado]}</span>
        {propiedad.codigo && (
          <span className="cd-vigencia">
            <Icon name="building" size={16} />
            {propiedad.codigo}
          </span>
        )}
      </div>

      <Tarjeta
        titulo="Contrato vigente"
        icono={<Icon name="file" size={18} />}
        accion={vigente && (
          <Button size="small" variant="outline" onClick={() => onVerContrato(vigente.id)}>
            <Icon name="eye" size={15} />
            Ver contrato
          </Button>
        )}
      >
        {vigente ? (
          <dl className="cd-datos">
            <Dato etiqueta="Inquilino">{nombreInquilino(vigente.inquilinos)}</Dato>
            <Dato etiqueta="Estado del contrato">
              <span className={`estado-tag estado-${vigente.estado}`}>{ESTADO_CONTRATO_LABELS[vigente.estado]}</span>
            </Dato>
            <Dato etiqueta="Vigencia">
              {formatearFecha(vigente.fecha_inicio)} al {formatearFecha(vigente.fecha_fin)}
            </Dato>
            <Dato etiqueta="Alquiler actual" destacado>{formatearMonto(vigente.monto_actual)}</Dato>
          </dl>
        ) : (
          <p className="cd-vacio">
            {propiedad.estado === 'mantenimiento'
              ? 'La propiedad está en mantenimiento y no se puede alquilar hasta volver a Disponible.'
              : 'No tiene un contrato vigente. Se puede alquilar creando un contrato nuevo.'}
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Inmueble" icono={<Icon name="building" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta="Dirección" ancho>{direccionPropiedad(propiedad)}</Dato>
          <Dato etiqueta="Tipo">{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</Dato>
          <Dato etiqueta="Propietario">{nombrePropietario(propiedad.propietarios)}</Dato>
          <Dato etiqueta="Ambientes">{propiedad.ambientes || '—'}</Dato>
          <Dato etiqueta="Superficie">{propiedad.superficie_m2 ? `${propiedad.superficie_m2} m²` : '—'}</Dato>
          <Dato etiqueta="Código postal">{propiedad.codigo_postal || '—'}</Dato>
          {propiedad.descripcion && <Dato etiqueta="Descripción" ancho>{propiedad.descripcion}</Dato>}
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Historial de contratos" icono={<Icon name="calendar" size={18} />} contador={contratos.length}>
        {contratos.length === 0 ? (
          <p className="cd-vacio">Todavía no tiene contratos.</p>
        ) : (
          <div className="cd-tabla-contenedor">
            <table className="cd-tabla">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Inquilino</th>
                  <th>Vigencia</th>
                  <th className="cd-num">Alquiler</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato) => (
                  <tr key={contrato.id}>
                    <td><span className={`estado-tag estado-${contrato.estado}`}>{ESTADO_CONTRATO_LABELS[contrato.estado]}</span></td>
                    <td>{nombreInquilino(contrato.inquilinos)}</td>
                    <td>{formatearFecha(contrato.fecha_inicio)} al {formatearFecha(contrato.fecha_fin)}</td>
                    <td className="cd-num">{formatearMonto(contrato.monto_actual)}</td>
                    <td className="cd-num">
                      <button
                        type="button"
                        className="cd-icono-btn"
                        onClick={() => onVerContrato(contrato.id)}
                        title="Ver contrato"
                        aria-label="Ver contrato"
                      >
                        <Icon name="eye" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Historial de reclamos" icono={<Icon name="alert" size={18} />} contador={reclamos.length}>
        {reclamos.length === 0 ? (
          <p className="cd-vacio">Todavía no tiene reclamos.</p>
        ) : (
          <div className="cd-tabla-contenedor">
            <table className="cd-tabla">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Reclamo</th>
                  <th>Inquilino</th>
                  <th>Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {reclamos.map((reclamo) => (
                  <tr key={reclamo.id}>
                    <td>
                      <span className={`estado-tag pr-reclamo-${reclamo.estado}`}>
                        {ESTADO_RECLAMO_LABELS[reclamo.estado]}
                      </span>
                    </td>
                    <td>{formatearFecha(reclamo.creado_en)}</td>
                    <td>
                      <strong>{reclamo.titulo}</strong>
                      <div className="pr-secundaria">{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]}</div>
                    </td>
                    <td>{nombreInquilino(reclamo.contrato.inquilinos)}</td>
                    <td>{PRIORIDAD_RECLAMO_LABELS[reclamo.prioridad]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {contratos.length > 0 && (
        <div className="cd-info" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>Esta propiedad no se puede eliminar por tener contratos asociados.</p>
        </div>
      )}

      <div className="cd-acciones pr-acciones">
        <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
        <Button variant="outline" onClick={onEditar}>
          <Icon name="edit" size={16} />
          Editar
        </Button>
        {contratos.length === 0 && (
          <Button variant="danger" onClick={onEliminar}>Eliminar propiedad</Button>
        )}
      </div>
    </div>
  );
}
