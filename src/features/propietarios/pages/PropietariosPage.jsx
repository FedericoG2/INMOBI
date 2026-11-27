import { useState } from 'react';
import { TIPO_PERSONA, TIPO_PERSONA_LABELS } from '../../../constants/estados';
import { nombrePropietario } from '../../../services/propiedadesService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Encabezado } from '../../../shared/components/Encabezado';
import { Icon, IconButton } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import { PropietarioDetalle } from '../components/PropietarioDetalle';
import { PropietarioForm } from '../components/PropietarioForm';
import { usePropietarios } from '../hooks/usePropietarios';

const INDICADORES = [
  { valor: '', titulo: 'Propietarios', ayuda: 'Total cargados', icono: 'users', tono: 'total', incluye: () => true },
  { valor: 'con', titulo: 'Con propiedades', ayuda: 'Tienen inmuebles asignados', icono: 'building', tono: 'ok', incluye: (p) => (p.propiedades || []).length > 0 },
  { valor: 'sin', titulo: 'Sin propiedades', ayuda: 'Falta asignarles un inmueble', icono: 'alert', tono: 'aviso', incluye: (p) => (p.propiedades || []).length === 0 },
];


export function PropietariosPage() {
  const { propietarios, loading, error, crear, actualizar, eliminar, recargar } = usePropietarios();

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [cartera, setCartera] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const toast = useToast();

  const texto = busqueda.trim().toLowerCase();
  const indicador = INDICADORES.find((item) => item.valor === cartera);
  const filtrados = propietarios.filter((propietario) => {
    if (!indicador.incluye(propietario)) return false;
    if (tipo && propietario.tipo_persona !== tipo) return false;
    if (!texto) return true;
    return [
      nombrePropietario(propietario),
      propietario.documento,
      propietario.email,
      propietario.telefono,
      ...(propietario.propiedades || []).map((propiedad) => propiedad.codigo),
    ].some((campo) => String(campo || '').toLowerCase().includes(texto));
  });
  const paginacion = usePaginacion(filtrados, `${texto}|${tipo}|${cartera}`);
  const hayFiltros = Boolean(texto || tipo || cartera);
  const detalle = propietarios.find((propietario) => propietario.id === detalleId) || null;

  function abrirForm(propietario = null) {
    setDetalleId(null);
    setEditando(propietario);
    setModalAbierto(true);
  }

  function cerrarForm() {
    setModalAbierto(false);
    setEditando(null);
  }

  // Los errores los muestra el formulario.
  async function handleSubmit(datos) {
    const guardado = editando ? await actualizar(editando.id, datos) : await crear(datos);
    toast.success(`Propietario ${editando ? 'actualizado' : 'creado'} correctamente: ${nombrePropietario(guardado)}`);
    cerrarForm();
  }

  async function handleEliminar() {
    setEliminando(true);
    try {
      await eliminar(aEliminar.id);
      toast.success(`Propietario eliminado: ${nombrePropietario(aEliminar)}`);
      setAEliminar(null);
      setDetalleId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEliminando(false);
    }
  }

  if (loading && propietarios.length === 0) {
    return <div className="page-loading">Cargando propietarios...</div>;
  }

  return (
    <div className="ls-pagina">
      <Encabezado icono="users" titulo="Propietarios" subtitulo="Dueños de los inmuebles en administración" />

      {error && (
        <div className="error-message">
          Error al cargar propietarios: {error}
          <Button size="small" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      <div className="ls-kpis">
        {INDICADORES.map((item) => (
          <button
            type="button"
            key={item.titulo}
            className={`ls-kpi ls-kpi-${item.tono}${cartera === item.valor ? ' is-activo' : ''}`}
            onClick={() => setCartera(item.valor)}
            aria-pressed={cartera === item.valor}
          >
            <span className="ls-kpi-icono"><Icon name={item.icono} size={18} /></span>
            <strong>{propietarios.filter(item.incluye).length}</strong>
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
          <Button variant="secondary" size="small" onClick={() => { setBusqueda(''); setTipo(''); setCartera(''); }}>Limpiar filtros</Button>
        )}
        <Button variant="success" className="btn btn-success btn-medium boton-nuevo" onClick={() => abrirForm()}>Nuevo propietario</Button>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          {propietarios.length === 0 ? (
            <>
              <p>No hay propietarios registrados.</p>
              <Button variant="success" onClick={() => abrirForm()}>Crear el primero</Button>
            </>
          ) : (
            <p>No hay propietarios con esos filtros.</p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Propietario</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Propiedades</th>
                <th className="ls-columna-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((propietario) => {
                const propiedades = propietario.propiedades || [];
                const codigos = propiedades.map((propiedad) => propiedad.codigo).filter(Boolean);
                return (
                  <tr key={propietario.id} className="ls-fila" onClick={() => setDetalleId(propietario.id)}>
                    <td>
                      <div className="ls-principal dato-clave">{nombrePropietario(propietario)}</div>
                      <span className="ls-pildora">
                        {propietario.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {propietario.documento}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${propietario.tipo_persona}`}>{TIPO_PERSONA_LABELS[propietario.tipo_persona]}</span>
                    </td>
                    <td>
                      <div className="ls-principal">{propietario.email || '—'}</div>
                      {propietario.telefono && <div className="ls-secundaria">{propietario.telefono}</div>}
                    </td>
                    <td>
                      {propiedades.length === 0 ? (
                        <span className="ls-secundaria">Sin propiedades</span>
                      ) : (
                        <>
                          <div className="ls-principal">
                            {propiedades.length} {propiedades.length === 1 ? 'propiedad' : 'propiedades'}
                          </div>
                          {codigos.length > 0 && (
                            <div className="ls-chips">
                              {codigos.slice(0, 3).map((codigo) => <span className="ls-chip" key={codigo}>{codigo}</span>)}
                              {codigos.length > 3 && <span className="ls-chip">+{codigos.length - 3}</span>}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="ls-columna-acciones" onClick={(event) => event.stopPropagation()}>
                      <div className="ls-botones">
                        <Button variant="secondary" size="small" onClick={() => setDetalleId(propietario.id)}>
                          <Icon name="eye" size={15} />
                          Ver detalle
                        </Button>
                        <IconButton label="Editar" name="edit" onClick={() => abrirForm(propietario)} />
                        {propiedades.length === 0 ? (
                          <IconButton label="Eliminar" name="trash" tone="danger" onClick={() => setAEliminar(propietario)} />
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
        title={editando ? 'Editar Propietario' : 'Nuevo Propietario'}
        icon={<Icon name="users" size={22} />}
        size="large"
        tall
      >
        <PropietarioForm
          propietario={editando}
          tienePropiedades={(editando?.propiedades || []).length > 0}
          onSubmit={handleSubmit}
          onCancel={cerrarForm}
        />
      </Modal>

      <Modal
        isOpen={Boolean(detalle)}
        onClose={() => setDetalleId(null)}
        title="Detalle del propietario"
        icon={<Icon name="users" size={22} />}
        size="large"
        tall
      >
        {detalle && (
          <PropietarioDetalle
            propietario={detalle}
            onEditar={() => abrirForm(detalle)}
            onEliminar={() => setAEliminar(detalle)}
            onCerrar={() => setDetalleId(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar propietario"
        message={`Vas a eliminar a ${aEliminar ? nombrePropietario(aEliminar) : ''}.`}
        warning="Esta acción no se puede deshacer."
        confirmLabel="Eliminar propietario"
        cancelLabel="Volver"
        variant="danger"
        busy={eliminando}
        onConfirm={handleEliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  );
}
