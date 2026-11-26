import { useState } from 'react';
import { useContratos } from '../hooks/useContratos';
import { contratosService, nombreInquilino, direccionPropiedad, calcularProximoAumento } from '../../../services/contratosService';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { useToast } from '../../../shared/components/Toast';
import { ContratoForm } from '../components/ContratoForm';
import { ContratoDetalle } from '../components/ContratoDetalle';
import {
  ESTADO_CONTRATO,
  ESTADO_CONTRATO_LABELS,
  PERIODICIDAD_AJUSTE_LABELS,
  TIPO_AJUSTE_LABELS,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';
import '../../../shared/styles/listado.css';
import './ContratosPage.css';

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function duracionTexto(fechaInicio, fechaFin) {
  const [anioInicio, mesInicio] = fechaInicio.split('-').map(Number);
  const [anioFin, mesFin] = fechaFin.split('-').map(Number);
  const meses = (anioFin - anioInicio) * 12 + (mesFin - mesInicio) + 1;
  if (meses > 0 && meses % 12 === 0) {
    const anios = meses / 12;
    return `${anios} ${anios === 1 ? 'año' : 'años'}`;
  }
  return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

function diasHasta(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const hoy = new Date();
  return Math.round((Date.UTC(anio, mes - 1, dia) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
}

// Aviso de lo que está por pasar con el contrato; null si no hay nada cercano.
function avisoVigencia({ estado, fecha_inicio: inicio, fecha_fin: fin }) {
  if (estado === ESTADO_CONTRATO.PROGRAMADO) {
    const dias = diasHasta(inicio);
    if (dias > 1) return { tono: 'info', texto: `Comienza en ${dias} días` };
    return { tono: 'info', texto: dias === 1 ? 'Comienza mañana' : 'Comienza hoy' };
  }
  if (estado === ESTADO_CONTRATO.ACTIVO) {
    const dias = diasHasta(fin);
    if (dias >= 0 && dias <= 60) return { tono: 'pronto', texto: dias === 0 ? 'Finaliza hoy' : `Finaliza en ${dias} días` };
  }
  return null;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function etiquetaMesAnio(fecha) {
  const [anio, mes] = fecha.split('-').map(Number);
  return `${MESES[mes - 1]} ${anio}`;
}

function formatearMonto(monto) {
  return `$ ${parseFloat(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const INDICADORES = [
  { estado: ESTADO_CONTRATO.ACTIVO, titulo: 'Activos', ayuda: 'En curso', icono: 'check' },
  { estado: ESTADO_CONTRATO.PROGRAMADO, titulo: 'Programados', ayuda: 'Todavía no comenzaron', icono: 'calendar' },
  { estado: ESTADO_CONTRATO.FINALIZADO, titulo: 'Finalizados', ayuda: 'Cumplieron su plazo', icono: 'file' },

];

// Se traen todos: los indicadores cuentan cada estado y el filtro se aplica en pantalla.
const TODOS = { estado: null };

export function ContratosPage() {
  const { contratos, loading, error, recargar } = useContratos(TODOS);
  const [estadoElegido, setEstadoElegido] = useState('');

  const [modalCrear, setModalCrear] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const toast = useToast();

  async function handleCrear(datos) {
    const { documentos = [], contratoFirmado = null, ...contrato } = datos;
    const creado = await contratosService.crear(contrato);
    const archivos = [
      ...documentos.map((archivo) => ({ archivo, firmado: false })),
      ...(contratoFirmado ? [{ archivo: contratoFirmado, firmado: true }] : []),
    ];
    const fallidos = [];

    for (const item of archivos) {
      try {
        await contratosService.subirDocumento(creado.id, item.archivo, item.firmado);
      } catch {
        fallidos.push(item.archivo.name);
      }
    }

    setModalCrear(false);
    await recargar();

    const resumen = `${nombreInquilino(creado.inquilinos)} · ${direccionPropiedad(creado.propiedades)}`;
    if (fallidos.length > 0) {
      toast.warning(`Contrato creado (${resumen}), pero no se pudo adjuntar: ${fallidos.join(', ')}. Podés cargarlo después desde el detalle.`);
    } else {
      toast.success(`Contrato creado correctamente: ${resumen}`);
    }
  }

  function handleVerDetalle(contrato) {
    setContratoSeleccionado(contrato);
  }

  const contratosFiltrados = contratos.filter((contrato) => {
    if (estadoElegido && contrato.estado !== estadoElegido) return false;
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;

    const inquilino = nombreInquilino(contrato.inquilinos);
    const propiedad = direccionPropiedad(contrato.propiedades);
    const codigo = contrato.propiedades?.codigo || '';

    return (
      inquilino.toLowerCase().includes(texto) ||
      propiedad.toLowerCase().includes(texto) ||
      codigo.toLowerCase().includes(texto)
    );
  });

  const paginacion = usePaginacion(contratosFiltrados, `${busqueda}|${estadoElegido}`);
  return (
    <div className="contratos-page">
      <div className="page-header">
        <div className="ct-encabezado-titulo">
          <span className="ct-encabezado-icono"><Icon name="file" size={24} /></span>
          <div>
            <h1>Contratos</h1>
            <p className="page-subtitle">Gestión de contratos de alquiler y documentos adjuntos</p>
          </div>
        </div>
        <Button variant="success" onClick={() => setModalCrear(true)}>Nuevo contrato</Button>
      </div>

      <div className="ls-kpis ct-kpis">
        {INDICADORES.map((indicador) => (
          <button
            type="button"
            key={indicador.estado}
            className={`ls-kpi ct-kpi-${indicador.estado}${estadoElegido === indicador.estado ? ' is-activo' : ''}`}
            onClick={() => setEstadoElegido(estadoElegido === indicador.estado ? '' : indicador.estado)}
            aria-pressed={estadoElegido === indicador.estado}
          >
            <span className="ls-kpi-icono"><Icon name={indicador.icono} size={18} /></span>
            <strong>{contratos.filter((contrato) => contrato.estado === indicador.estado).length}</strong>
            <span className="ls-kpi-titulo">{indicador.titulo}</span>
            <small>{indicador.ayuda}</small>
          </button>
        ))}
      </div>

      <div className="page-filters">
        <input
          type="text"
          placeholder="Buscar por inquilino, propiedad o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input"
        />

        <select
          value={estadoElegido}
          onChange={(e) => setEstadoElegido(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          {Object.values(ESTADO_CONTRATO).map((estado) => (
            <option key={estado} value={estado}>
              {ESTADO_CONTRATO_LABELS[estado]}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="page-loading">Cargando contratos...</div>}
      {error && <div className="page-error">Error: {error}</div>}

      {!loading && !error && contratosFiltrados.length === 0 && (
        <div className="page-empty">
          {contratos.length === 0 ? (
            <>
              <p>No hay contratos registrados</p>
              <Button variant="success" onClick={() => setModalCrear(true)}>Crear primer contrato</Button>
            </>
          ) : (
            <p>No se encontraron contratos con ese criterio</p>
          )}
        </div>
      )}

      {!loading && !error && contratosFiltrados.length > 0 && (
        <div className="contratos-tabla-wrapper">
          <table className="contratos-tabla">
            <thead>
              <tr>
                <th className="ct-estado">Estado</th>
                <th>Inquilino</th>
                <th>Propiedad</th>
                <th>Vigencia</th>
                <th>Alquiler mensual</th>
                <th>Próximo aumento</th>
                <th className="ct-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((contrato) => {
                const proximoAumento = calcularProximoAumento(contrato);
                const inquilino = contrato.inquilinos;
                const propiedad = contrato.propiedades;
                const montoCambio = Number(contrato.monto_actual) !== Number(contrato.monto_inicial);
                const aviso = avisoVigencia(contrato);
                return (
                  <tr key={contrato.id} className="ct-fila" onClick={() => handleVerDetalle(contrato)}>
                    <td className="ct-estado">
                      <span className={`estado-tag estado-${contrato.estado}`}>
                        {ESTADO_CONTRATO_LABELS[contrato.estado]}
                      </span>
                    </td>
                    <td>
                      <div className="ct-principal">{nombreInquilino(inquilino)}</div>
                      {inquilino?.documento && (
                        <span className="ct-pildora">
                          {inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {inquilino.documento}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="ct-principal">
                        {propiedad?.codigo && <><span className="ct-codigo">{propiedad.codigo}</span> - </>}
                        {direccionPropiedad(propiedad)}
                      </div>
                      {propiedad?.tipo && (
                        <div className="ct-secundaria">{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</div>
                      )}
                    </td>
                    <td>
                      <div className="ct-principal ct-rango">
                        {formatearFecha(contrato.fecha_inicio)}
                        <span aria-label="hasta">→</span>
                        {formatearFecha(contrato.fecha_fin)}
                      </div>
                      <div className="ct-secundaria">
                        {duracionTexto(contrato.fecha_inicio, contrato.fecha_fin)}
                        {aviso && <span className={`ct-chip ct-chip-${aviso.tono}`}>{aviso.texto}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="ct-principal ct-importe">{formatearMonto(contrato.monto_actual)}</div>
                      <div className="ct-secundaria">
                        {montoCambio ? `Inicial: ${formatearMonto(contrato.monto_inicial)}` : 'Monto inicial'}
                      </div>
                    </td>
                    <td>
                      <div className={proximoAumento ? 'ct-principal' : 'ct-secundaria'}>
                        {proximoAumento ? etiquetaMesAnio(proximoAumento) : 'Sin aumentos pendientes'}
                      </div>
                      <div className="ct-secundaria">
                        <span className="ct-ajuste">{TIPO_AJUSTE_LABELS[contrato.tipo_ajuste]}</span>
                        {PERIODICIDAD_AJUSTE_LABELS[contrato.periodicidad_ajuste]}
                      </div>
                    </td>
                    <td className="ct-acciones">
                      <div className="ls-botones">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(evento) => {
                            evento.stopPropagation();
                            handleVerDetalle(contrato);
                          }}
                        >
                          <Icon name="eye" size={15} />
                          Ver detalle
                        </Button>
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

      {modalCrear && (
        <Modal
          isOpen
          onClose={() => setModalCrear(false)}
          title="Nuevo contrato"
          icon={<Icon name="file" size={22} />}
          size="large"
          tall
        >
          <ContratoForm onSubmit={handleCrear} onCancel={() => setModalCrear(false)} />
        </Modal>
      )}

      {contratoSeleccionado && (
        <Modal
          isOpen
          onClose={() => setContratoSeleccionado(null)}
          title="Detalle del contrato"
          icon={<Icon name="file" size={22} />}
          size="large"
          tall
        >
          <ContratoDetalle
            contratoId={contratoSeleccionado.id}
            onCerrar={() => setContratoSeleccionado(null)}
            onActualizado={recargar}
          />
        </Modal>
      )}
    </div>
  );
}
