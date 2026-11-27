import { useState } from 'react';
import {
  ESTADO_CONTRATO_LABELS,
  ESTADO_PROPIEDAD,
  ESTADO_PROPIEDAD_LABELS,
  TIPO_PROPIEDAD,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';
import { nombreInquilino } from '../../../services/contratosService';
import { direccionPropiedad, nombrePropietario } from '../../../services/propiedadesService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Icon, IconButton } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import { ContratoDetalle } from '../../contratos/components/ContratoDetalle';
import { PropiedadDetalle } from '../components/PropiedadDetalle';
import { PropiedadForm } from '../components/PropiedadForm';
import { usePropiedades } from '../hooks/usePropiedades';
import { contratoVigente, formatearFecha, formatearMonto, ordenarContratos } from '../utils';
import './PropiedadesPage.css';

const INDICADORES = [
  { estado: ESTADO_PROPIEDAD.DISPONIBLE, titulo: 'Disponibles', ayuda: 'Listas para alquilar', icono: 'check' },
  { estado: ESTADO_PROPIEDAD.ALQUILADA, titulo: 'Alquiladas', ayuda: 'Con contrato activo', icono: 'file' },
  { estado: ESTADO_PROPIEDAD.RESERVADA, titulo: 'Reservadas', ayuda: 'Contrato por comenzar', icono: 'calendar' },
  { estado: ESTADO_PROPIEDAD.MANTENIMIENTO, titulo: 'En mantenimiento', ayuda: 'No disponibles', icono: 'alert' },
];

function ResumenContrato({ propiedad }) {
  const vigente = contratoVigente(propiedad);
  if (vigente) {
    return (
      <>
        <div className="pr-principal">{nombreInquilino(vigente.inquilinos)}</div>
        <div className="pr-alquiler"><strong>{formatearMonto(vigente.monto_actual)}</strong> por mes</div>
        <div className="pr-secundaria">
          {vigente.estado === 'programado'
            ? `Comienza el ${formatearFecha(vigente.fecha_inicio)}`
            : `Hasta el ${formatearFecha(vigente.fecha_fin)}`}
        </div>
      </>
    );
  }

  const ultimo = ordenarContratos(propiedad.contratos)[0];
  return (
    <>
      <div className="pr-secundaria">Sin contrato vigente</div>
      {ultimo && (
        <div className="pr-secundaria">Último: {ESTADO_CONTRATO_LABELS[ultimo.estado].toLowerCase()}</div>
      )}
    </>
  );
}

export function PropiedadesPage() {
  const { propiedades, loading, error, crear, actualizar, eliminar, recargar } = usePropiedades();

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [contratoId, setContratoId] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const toast = useToast();

  const texto = busqueda.trim().toLowerCase();
  const filtradas = propiedades.filter((propiedad) => {
    if (tipo && propiedad.tipo !== tipo) return false;
    if (estado && propiedad.estado !== estado) return false;
    if (!texto) return true;
    const vigente = contratoVigente(propiedad);
    return [
      propiedad.codigo,
      direccionPropiedad(propiedad),
      nombrePropietario(propiedad.propietarios),
      vigente && nombreInquilino(vigente.inquilinos),
    ].some((campo) => String(campo || '').toLowerCase().includes(texto));
  });
  const paginacion = usePaginacion(filtradas, `${texto}|${tipo}|${estado}`);
  const hayFiltros = Boolean(texto || tipo || estado);
  // Se toma de la lista para que el detalle refleje los cambios hechos en el contrato.
  const detalle = propiedades.find((propiedad) => propiedad.id === detalleId) || null;

  function abrirForm(propiedad = null) {
    setDetalleId(null);
    setEditando(propiedad);
    setModalAbierto(true);
  }

  function cerrarForm() {
    setModalAbierto(false);
    setEditando(null);
  }

  function limpiarFiltros() {
    setBusqueda('');
    setTipo('');
    setEstado('');
  }

  async function handleSubmit(data) {
    const guardada = editando ? await actualizar(editando.id, data) : await crear(data);
    toast.success(`Propiedad ${editando ? 'actualizada' : 'creada'} correctamente: ${direccionPropiedad(guardada)}`);
    cerrarForm();
  }

  async function handleEliminar() {
    setEliminando(true);
    try {
      await eliminar(aEliminar.id);
      toast.success(`Propiedad eliminada: ${direccionPropiedad(aEliminar)}`);
      setAEliminar(null);
      setDetalleId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEliminando(false);
    }
  }

  if (loading && propiedades.length === 0) {
    return <div className="page-loading">Cargando propiedades...</div>;
  }

  return (
    <div className="propiedades-page">
      <div className="page-header">
        <div className="pr-encabezado-titulo">
          <span className="pr-encabezado-icono"><Icon name="building" size={24} /></span>
          <div>
            <h1>Propiedades</h1>
            <p className="page-subtitle">Inmuebles en administración y su situación actual</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error al cargar propiedades: {error}
          <Button size="small" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      <div className="pr-kpis">
        {INDICADORES.map((indicador) => (
          <button
            type="button"
            key={indicador.estado}
            className={`pr-kpi pr-kpi-${indicador.estado}${estado === indicador.estado ? ' is-activo' : ''}`}
            onClick={() => setEstado(estado === indicador.estado ? '' : indicador.estado)}
            aria-pressed={estado === indicador.estado}
          >
            <span className="pr-kpi-icono"><Icon name={indicador.icono} size={18} /></span>
            <strong>{propiedades.filter((propiedad) => propiedad.estado === indicador.estado).length}</strong>
            <span className="pr-kpi-titulo">{indicador.titulo}</span>
            <small>{indicador.ayuda}</small>
          </button>
        ))}
      </div>

      <div className="filtros-container">
        <input
          className="search-input"
          placeholder="Buscar por dirección, código, propietario o inquilino..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="filter-select" aria-label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.values(TIPO_PROPIEDAD).map((valor) => (
            <option key={valor} value={valor}>{TIPO_PROPIEDAD_LABELS[valor]}</option>
          ))}
        </select>
        <select className="filter-select" aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.values(ESTADO_PROPIEDAD).map((valor) => (
            <option key={valor} value={valor}>{ESTADO_PROPIEDAD_LABELS[valor]}</option>
          ))}
        </select>
        {hayFiltros && (
          <Button variant="secondary" size="small" onClick={limpiarFiltros}>Limpiar filtros</Button>
        )}
        <Button variant="success" className="btn btn-success btn-medium boton-nuevo" onClick={() => abrirForm()}>Nueva propiedad</Button>
      </div>

      {filtradas.length === 0 ? (
        <div className="empty-state">
          {propiedades.length === 0 ? (
            <>
              <p>No hay propiedades registradas.</p>
              <Button variant="success" onClick={() => abrirForm()}>Crear la primera</Button>
            </>
          ) : (
            <p>No hay propiedades con esos filtros.</p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Propiedad</th>
                <th>Propietario</th>
                <th>Contrato</th>
                <th className="pr-columna-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((propiedad) => {
                const propietario = propiedad.propietarios;
                const sinContratos = (propiedad.contratos || []).length === 0;
                return (
                  <tr key={propiedad.id} className="pr-fila" onClick={() => setDetalleId(propiedad.id)}>
                    <td>
                      <span className={`estado-tag badge-${propiedad.estado}`}>
                        {ESTADO_PROPIEDAD_LABELS[propiedad.estado]}
                      </span>
                    </td>
                    <td>
                      <div className="pr-principal">
                        {propiedad.codigo && <><span className="pr-codigo">{propiedad.codigo}</span> - </>}
                        {direccionPropiedad(propiedad)}
                      </div>
                      <div className="pr-secundaria">{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</div>
                    </td>
                    <td>
                      <div className="pr-principal">{nombrePropietario(propietario)}</div>
                      {propietario?.documento && (
                        <span className="pr-pildora">
                          {propietario.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {propietario.documento}
                        </span>
                      )}
                    </td>
                    <td><ResumenContrato propiedad={propiedad} /></td>
                    <td className="pr-columna-acciones" onClick={(event) => event.stopPropagation()}>
                      <div className="pr-botones">
                        <Button variant="secondary" size="small" onClick={() => setDetalleId(propiedad.id)}>
                          <Icon name="eye" size={15} />
                          Ver detalle
                        </Button>
                        <IconButton label="Editar" name="edit" onClick={() => abrirForm(propiedad)} />
                        {sinContratos ? (
                          <IconButton label="Eliminar" name="trash" tone="danger" onClick={() => setAEliminar(propiedad)} />
                        ) : (
                          <span className="pr-hueco" aria-hidden="true" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Paginacion {...paginacion} onChange={paginacion.setPagina} />
        </div>
      )}

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarForm}
        title={editando ? 'Editar propiedad' : 'Nueva propiedad'}
        icon={<Icon name="building" size={22} />}
        size="large"
        tall
      >
        <PropiedadForm propiedad={editando} onSubmit={handleSubmit} onCancel={cerrarForm} />
      </Modal>

      <Modal
        isOpen={!!detalle && !contratoId}
        onClose={() => setDetalleId(null)}
        title="Detalle de la propiedad"
        icon={<Icon name="building" size={22} />}
        size="large"
        tall
      >
        {detalle && (
          <PropiedadDetalle
            propiedad={detalle}
            onVerContrato={setContratoId}
            onEditar={() => abrirForm(detalle)}
            onEliminar={() => setAEliminar(detalle)}
            onCerrar={() => setDetalleId(null)}
          />
        )}
      </Modal>

      {/* Al cerrar el contrato se vuelve al detalle de la propiedad. */}
      {contratoId && (
        <Modal
          isOpen
          onClose={() => setContratoId(null)}
          title="Detalle del contrato"
          icon={<Icon name="file" size={22} />}
          size="large"
          tall
        >
          <ContratoDetalle
            contratoId={contratoId}
            onCerrar={() => setContratoId(null)}
            onActualizado={recargar}
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!aEliminar}
        title="Eliminar propiedad"
        message={`Vas a eliminar la propiedad ${aEliminar ? direccionPropiedad(aEliminar) : ''}.`}
        warning="Esta acción no se puede deshacer."
        confirmLabel="Eliminar propiedad"
        cancelLabel="Volver"
        variant="danger"
        busy={eliminando}
        onConfirm={handleEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
