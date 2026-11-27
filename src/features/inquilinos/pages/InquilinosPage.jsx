import { useState } from 'react';
import { ESTADO_CONTRATO_LABELS, TIPO_PERSONA, TIPO_PERSONA_LABELS } from '../../../constants/estados';
import { direccionPropiedad } from '../../../services/contratosService';
import { nombreInquilino } from '../../../services/inquilinosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Encabezado } from '../../../shared/components/Encabezado';
import { Icon, IconButton } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import { ContratoDetalle } from '../../contratos/components/ContratoDetalle';
import { contratosVigentes } from '../../propiedades/utils';
import { InquilinoDetalle } from '../components/InquilinoDetalle';
import { InquilinoForm } from '../components/InquilinoForm';
import { useInquilinos } from '../hooks/useInquilinos';

const INDICADORES = [
  { valor: '', titulo: 'Inquilinos', ayuda: 'Total cargados', icono: 'user', tono: 'total', incluye: () => true },
  { valor: 'con', titulo: 'Con contrato', ayuda: 'Alquilando o con reserva', icono: 'file', tono: 'ok', incluye: (i) => contratosVigentes(i).length > 0 },
  { valor: 'sin', titulo: 'Sin contrato', ayuda: 'Disponibles para un nuevo alquiler', icono: 'alert', tono: 'aviso', incluye: (i) => contratosVigentes(i).length === 0 },
];

export function InquilinosPage() {
  const { inquilinos, loading, error, crear, actualizar, eliminar, recargar } = useInquilinos();

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');

  const [situacion, setSituacion] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [contratoId, setContratoId] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const toast = useToast();

  const texto = busqueda.trim().toLowerCase();
  const indicador = INDICADORES.find((item) => item.valor === situacion);
  const filtrados = inquilinos.filter((inquilino) => {
    if (!indicador.incluye(inquilino)) return false;
    if (tipo && inquilino.tipo_persona !== tipo) return false;

    if (!texto) return true;
    return [
      nombreInquilino(inquilino),
      inquilino.documento,
      inquilino.email,
      inquilino.telefono,
      ...contratosVigentes(inquilino).map((contrato) => contrato.propiedades?.codigo),
    ].some((campo) => String(campo || '').toLowerCase().includes(texto));
  });
  const paginacion = usePaginacion(filtrados, `${texto}|${tipo}|${situacion}`);
  const hayFiltros = Boolean(texto || tipo || situacion);
  const detalle = inquilinos.find((inquilino) => inquilino.id === detalleId) || null;

  function abrirForm(inquilino = null) {
    setDetalleId(null);
    setEditando(inquilino);
    setModalAbierto(true);
  }

  function cerrarForm() {
    setModalAbierto(false);
    setEditando(null);
  }

  function limpiarFiltros() {
    setBusqueda('');
    setTipo('');

    setSituacion('');
  }

  // Los errores los muestra el formulario.
  async function handleSubmit(datos) {
    const guardado = editando ? await actualizar(editando.id, datos) : await crear(datos);
    toast.success(`Inquilino ${editando ? 'actualizado' : 'creado'} correctamente: ${nombreInquilino(guardado)}`);
    cerrarForm();
  }

  async function handleEliminar() {
    setEliminando(true);
    try {
      await eliminar(aEliminar.id);
      toast.success(`Inquilino eliminado: ${nombreInquilino(aEliminar)}`);
      setAEliminar(null);
      setDetalleId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEliminando(false);
    }
  }

  if (loading && inquilinos.length === 0) {
    return <div className="page-loading">Cargando inquilinos...</div>;
  }

  return (
    <div className="ls-pagina">
      <Encabezado icono="user" titulo="Inquilinos" subtitulo="Locatarios y sus contratos" />

      {error && (
        <div className="error-message">
          Error al cargar inquilinos: {error}
          <Button size="small" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      <div className="ls-kpis">
        {INDICADORES.map((item) => (
          <button
            type="button"
            key={item.titulo}
            className={`ls-kpi ls-kpi-${item.tono}${situacion === item.valor ? ' is-activo' : ''}`}
            onClick={() => setSituacion(item.valor)}
            aria-pressed={situacion === item.valor}
          >
            <span className="ls-kpi-icono"><Icon name={item.icono} size={18} /></span>
            <strong>{inquilinos.filter(item.incluye).length}</strong>
            <span className="ls-kpi-titulo">{item.titulo}</span>
            <small>{item.ayuda}</small>
          </button>
        ))}
      </div>

      <div className="filtros-container">
        <input
          className="search-input"
          placeholder="Buscar por nombre, documento, email o código de propiedad..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <select className="filter-select" aria-label="Tipo de persona" value={tipo} onChange={(event) => setTipo(event.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.values(TIPO_PERSONA).map((valor) => (
            <option key={valor} value={valor}>{TIPO_PERSONA_LABELS[valor]}</option>
          ))}
        </select>

        {hayFiltros && (
          <Button variant="secondary" size="small" onClick={limpiarFiltros}>Limpiar filtros</Button>
        )}
        <Button variant="success" className="btn btn-success btn-medium boton-nuevo" onClick={() => abrirForm()}>Nuevo inquilino</Button>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          {inquilinos.length === 0 ? (
            <>
              <p>No hay inquilinos registrados.</p>
              <Button variant="success" onClick={() => abrirForm()}>Crear el primero</Button>
            </>
          ) : (
            <p>No hay inquilinos con esos filtros.</p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inquilino</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Contrato</th>
                <th>Portal</th>
                <th className="ls-columna-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((inquilino) => {
                const vigentes = contratosVigentes(inquilino);
                return (
                  <tr key={inquilino.id} className="ls-fila" onClick={() => setDetalleId(inquilino.id)}>
                    <td>
                      <div className="ls-principal dato-clave">{nombreInquilino(inquilino)}</div>
                      <span className="ls-pildora">
                        {inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {inquilino.documento}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${inquilino.tipo_persona}`}>{TIPO_PERSONA_LABELS[inquilino.tipo_persona]}</span>
                    </td>
                    <td>
                      <div className="ls-principal">{inquilino.email || '—'}</div>
                      {inquilino.telefono && <div className="ls-secundaria">{inquilino.telefono}</div>}
                    </td>
                    <td>
                      {vigentes.length === 0 ? (
                        <span className="ls-secundaria">Sin contrato vigente</span>
                      ) : (
                        <ul className="ls-contratos">
                          {vigentes.slice(0, 3).map((contrato) => (
                            <li key={contrato.id}>
                              {contrato.propiedades?.codigo && <span className="ls-chip">{contrato.propiedades.codigo}</span>}
                              <div>
                                <div className="ls-principal">{contrato.propiedades ? direccionPropiedad(contrato.propiedades) : '—'}</div>
                                <div className="ls-secundaria">Contrato {ESTADO_CONTRATO_LABELS[contrato.estado].toLowerCase()}</div>
                              </div>
                            </li>
                          ))}
                          {vigentes.length > 3 && <li className="ls-secundaria">y {vigentes.length - 3} más</li>}
                        </ul>
                      )}
                    </td>
                    <td>
                      <span className={`estado-tag ${inquilino.usuario_id ? 'badge-disponible' : 'ls-neutro'}`}>
                        {inquilino.usuario_id ? 'Habilitado' : 'Sin acceso'}
                      </span>
                    </td>
                    <td className="ls-columna-acciones" onClick={(event) => event.stopPropagation()}>
                      <div className="ls-botones">
                        <Button variant="secondary" size="small" onClick={() => setDetalleId(inquilino.id)}>
                          <Icon name="eye" size={15} />
                          Ver detalle
                        </Button>
                        <IconButton label="Editar" name="edit" onClick={() => abrirForm(inquilino)} />
                        {(inquilino.contratos || []).length === 0 ? (
                          <IconButton label="Eliminar" name="trash" tone="danger" onClick={() => setAEliminar(inquilino)} />
                        ) : (
                          <span className="ls-hueco" aria-hidden="true" />
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
        title={editando ? 'Editar Inquilino' : 'Nuevo Inquilino'}
        icon={<Icon name="user" size={22} />}
        size="large"
        tall
      >
        <InquilinoForm inquilino={editando} onSubmit={handleSubmit} onCancel={cerrarForm} />
      </Modal>

      <Modal
        isOpen={Boolean(detalle) && !contratoId}
        onClose={() => setDetalleId(null)}
        title="Detalle del inquilino"
        icon={<Icon name="user" size={22} />}
        size="large"
        tall
      >
        {detalle && (
          <InquilinoDetalle
            inquilino={detalle}
            onVerContrato={setContratoId}
            onEditar={() => abrirForm(detalle)}
            onEliminar={() => setAEliminar(detalle)}
            onCerrar={() => setDetalleId(null)}
          />
        )}
      </Modal>

      {/* Al cerrar el contrato se vuelve al detalle del inquilino. */}
      {contratoId && (
        <Modal
          isOpen
          onClose={() => setContratoId(null)}
          title="Detalle del contrato"
          icon={<Icon name="file" size={22} />}
          size="large"
          tall
        >
          <ContratoDetalle contratoId={contratoId} onCerrar={() => setContratoId(null)} onActualizado={recargar} />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar inquilino"
        message={`Vas a eliminar a ${aEliminar ? nombreInquilino(aEliminar) : ''}.`}
        warning="Esta acción no se puede deshacer."
        confirmLabel="Eliminar inquilino"
        cancelLabel="Volver"
        variant="danger"
        busy={eliminando}
        onConfirm={handleEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
