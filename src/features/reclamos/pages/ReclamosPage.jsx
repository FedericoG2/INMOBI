import { useEffect, useState } from 'react';
import {
  CATEGORIA_RECLAMO_LABELS,
  ESTADO_RECLAMO,
  ESTADO_RECLAMO_LABELS,
  PRIORIDAD_RECLAMO_LABELS,
} from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { formatearFechaHora, reclamosService } from '../../../services/reclamosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import { ReclamoDetalle } from '../components/ReclamoDetalle';
import { ReclamoForm } from '../components/ReclamoForm';
import { useReclamos } from '../hooks/useReclamos';
import './ReclamosPage.css';

const INDICADORES = [
  { estado: ESTADO_RECLAMO.PENDIENTE, titulo: 'Pendientes', ayuda: 'Sin gestionar', icono: 'alert' },
  { estado: ESTADO_RECLAMO.EN_PROCESO, titulo: 'En proceso', ayuda: 'Trabajándose', icono: 'trend' },
  { estado: ESTADO_RECLAMO.REVISION, titulo: 'En revisión', ayuda: 'Por verificar', icono: 'eye' },
  { estado: ESTADO_RECLAMO.RESUELTO, titulo: 'Resueltos', ayuda: 'Finalizados', icono: 'check' },
];

const FILTROS_VACIOS = { estado: '', prioridad: '', categoria: '' };

export function ReclamosPage() {
  // Se traen todos: la pantalla filtra en el navegador y cuenta cuántos hay en cada estado.
  const { reclamos, loading, error, recargar } = useReclamos();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [busqueda, setBusqueda] = useState('');
  const [contratos, setContratos] = useState([]);
  const [creando, setCreando] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!creando) return undefined;
    let vigente = true;
    reclamosService.listarContratosActivos()
      .then((data) => {
        if (vigente) setContratos(data || []);
      })
      .catch((err) => toast.error(err.message));
    return () => {
      vigente = false;
    };
  }, [creando]); // eslint-disable-line react-hooks/exhaustive-deps

  const texto = busqueda.trim().toLowerCase();
  const visibles = reclamos.filter((reclamo) => {
    if (filtros.estado && reclamo.estado !== filtros.estado) return false;
    if (filtros.prioridad && reclamo.prioridad !== filtros.prioridad) return false;
    if (filtros.categoria && reclamo.categoria !== filtros.categoria) return false;
    if (!texto) return true;
    const contrato = reclamo.contratos;
    return [
      reclamo.titulo,
      reclamo.descripcion,
      nombreInquilino(contrato?.inquilinos),
      contrato?.propiedades && direccionPropiedad(contrato.propiedades),
      contrato?.propiedades?.codigo,
    ].some((campo) => String(campo || '').toLowerCase().includes(texto));
  });
  const paginacion = usePaginacion(visibles, `${filtros.estado}|${filtros.prioridad}|${filtros.categoria}|${texto}`);
  const hayFiltros = Boolean(texto || filtros.estado || filtros.prioridad || filtros.categoria);

  function cambiarFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    setBusqueda('');
  }

  const selectores = [
    { campo: 'estado', etiqueta: 'Estado', todos: 'Todos los estados', opciones: ESTADO_RECLAMO_LABELS },
    { campo: 'prioridad', etiqueta: 'Prioridad', todos: 'Todas las prioridades', opciones: PRIORIDAD_RECLAMO_LABELS },
    { campo: 'categoria', etiqueta: 'Categoría', todos: 'Todas las categorías', opciones: CATEGORIA_RECLAMO_LABELS },
  ];

  return (
    <div className="page reclamos-page">
      <div className="page-header">
        <div className="rc-encabezado-titulo">
          <span className="rc-encabezado-icono"><Icon name="alert" size={24} /></span>
          <div>
            <h1>Reclamos</h1>
            <p className="page-subtitle">Gestión y seguimiento de reclamos de mantenimiento</p>
          </div>
        </div>
        <Button variant="success" onClick={() => setCreando(true)}>Nuevo reclamo</Button>
      </div>

      <div className="rc-kpis">
        {INDICADORES.map((indicador) => {
          const activo = filtros.estado === indicador.estado;
          return (
            <button
              type="button"
              key={indicador.estado}
              className={`rc-kpi rc-kpi-${indicador.estado}${activo ? ' is-activo' : ''}`}
              onClick={() => cambiarFiltro('estado', activo ? '' : indicador.estado)}
              aria-pressed={activo}
            >
              <span className="rc-kpi-icono"><Icon name={indicador.icono} size={18} /></span>
              <strong>{reclamos.filter((reclamo) => reclamo.estado === indicador.estado).length}</strong>
              <span className="rc-kpi-titulo">{indicador.titulo}</span>
              <small>{indicador.ayuda}</small>
            </button>
          );
        })}
      </div>

      <div className="filtros-container">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar por título, descripción, inquilino o inmueble..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        {selectores.map((selector) => (
          <select
            key={selector.campo}
            className="filter-select"
            aria-label={selector.etiqueta}
            value={filtros[selector.campo]}
            onChange={(event) => cambiarFiltro(selector.campo, event.target.value)}
          >
            <option value="">{selector.todos}</option>
            {Object.entries(selector.opciones).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        ))}
        {hayFiltros && (
          <Button variant="secondary" size="small" onClick={limpiarFiltros}>Limpiar filtros</Button>
        )}
      </div>

      {loading && <div className="page-loading">Cargando reclamos...</div>}
      {error && <div className="page-error">Error: {error}</div>}

      {!loading && !error && visibles.length === 0 && (
        <div className="page-empty">
          <p>{hayFiltros ? 'No hay reclamos con ese criterio.' : 'No hay reclamos cargados.'}</p>
          {!hayFiltros && <Button variant="success" onClick={() => setCreando(true)}>Registrar el primero</Button>}
        </div>
      )}

      {!loading && !error && visibles.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Reclamo</th>
                <th>Categoría</th>
                <th>Inquilino</th>
                <th>Inmueble</th>
                <th>Prioridad</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((reclamo) => {
                const inquilino = reclamo.contratos?.inquilinos;
                const propiedad = reclamo.contratos?.propiedades;
                return (
                  <tr key={reclamo.id} className="rc-fila" onClick={() => setSeleccionado(reclamo.id)}>
                    <td>
                      <span className={`estado-tag rc-estado-${reclamo.estado}`}>
                        {ESTADO_RECLAMO_LABELS[reclamo.estado]}
                      </span>
                    </td>
                    <td>
                      <div className="rc-principal">{reclamo.titulo}</div>
                    </td>
                    <td>{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]}</td>
                    <td>
                      <div className="rc-principal">{nombreInquilino(inquilino)}</div>
                      {inquilino?.documento && (
                        <span className="rc-pildora">
                          {inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {inquilino.documento}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="rc-principal">
                        {propiedad?.codigo && <><span className="rc-codigo">{propiedad.codigo}</span> - </>}
                        {propiedad ? direccionPropiedad(propiedad) : '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`estado-tag rc-prioridad-${reclamo.prioridad}`}>
                        {PRIORIDAD_RECLAMO_LABELS[reclamo.prioridad]}
                      </span>
                    </td>
                    <td className="rc-fecha">{formatearFechaHora(reclamo.creado_en).split(',')[0]}</td>
                    <td>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSeleccionado(reclamo.id);
                        }}
                      >
                        <Icon name="eye" size={15} />
                        Ver detalle
                      </Button>
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
        isOpen={creando}
        onClose={() => setCreando(false)}
        title="Nuevo Reclamo"
        icon={<Icon name="alert" size={22} />}
        size="large"
        tall
      >
        <ReclamoForm
          contratos={contratos}
          onCancelar={() => setCreando(false)}
          onGuardado={({ avisoImagenes }) => {
            setCreando(false);
            recargar();
            if (avisoImagenes) {
              toast.warning(`Reclamo registrado, pero no se pudieron adjuntar las imágenes: ${avisoImagenes}`);
            } else {
              toast.success('Reclamo registrado correctamente');
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={Boolean(seleccionado)}
        onClose={() => setSeleccionado(null)}
        title="Detalle del Reclamo"
        icon={<Icon name="alert" size={22} />}
        size="large"
        tall
      >
        {seleccionado && (
          <ReclamoDetalle
            reclamoId={seleccionado}
            onCerrar={() => setSeleccionado(null)}
            onActualizado={recargar}
          />
        )}
      </Modal>
    </div>
  );
}
