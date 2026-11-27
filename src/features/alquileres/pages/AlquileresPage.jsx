import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ESTADO_CONTRATO_LABELS,
  ESTADO_PERIODO_ALQUILER_LABELS,
} from '../../../constants/estados';
import {
  etiquetaMes,
  etiquetaPeriodo,
  etiquetaVencimiento,
  formatearFecha,
  faltaAplicarAumento,
  formatearMonto,
  nombreDueno,
} from '../../../services/alquileresService';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icons';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import { Modal } from '../../../shared/components/Modal';
import { PeriodoDetalle } from '../components/PeriodoDetalle';
import { useAlquileres, useResumenCobranza } from '../hooks/useAlquileres';
import { aumentosService } from '../../../services/aumentosService';
import { SelectorPeriodo } from '../../aumentos/components/SelectorPeriodo';
import './AlquileresPage.css';

export function AlquileresPage() {
  const ubicacion = useLocation();
  const filtrosIniciales = ubicacion.state?.filtros;
  const { resumen, cargado: resumenCargado, recargar: recargarResumen } = useResumenCobranza();
  // Mismo período de trabajo que en Aumentos: avanza solo y desde ahí se va hacia atrás.
  const vigente = aumentosService.obtenerPeriodoTrabajo();
  const claveVigente = `${vigente.anio}-${String(vigente.mes).padStart(2, '0')}`;
  const [filtros, setFiltros] = useState(() => ({ mes: claveVigente, estado: null, ...filtrosIniciales }));
  const [busqueda, setBusqueda] = useState('');
  const { periodos, loading, error, recargar } = useAlquileres(filtros);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [anioElegido, mesElegido] = (filtros.mes || '').split('-').map(Number);
  const periodoElegido = filtros.mes ? { anio: anioElegido, mes: mesElegido } : null;

  function recargarTodo() {
    recargar();
    recargarResumen();
  }

  function cambiarFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor || null }));
  }

  function limpiarFiltros() {
    setFiltros({ mes: claveVigente, estado: null });
    setBusqueda('');
  }

  const texto = busqueda.trim().toLowerCase();
  const hayFiltros = filtros.mes !== claveVigente || Boolean(filtros.estado) || Boolean(texto);
  const kpiMesActivo = filtros.mes === resumen.mesEnCurso && filtros.estado === 'pendiente';
  const kpiVencidosActivo = !filtros.mes && filtros.estado === 'vencido';

  const periodosFiltrados = periodos.filter((periodo) => {
    // Al ver todos los meses tampoco se muestran períodos futuros.
    if (`${periodo.periodo_anio}-${String(periodo.periodo_mes).padStart(2, '0')}` > claveVigente) return false;
    if (!texto) return true;
    const contrato = periodo.contratos;
    const campos = [
      nombreInquilino(contrato?.inquilinos),
      contrato?.inquilinos?.documento,
      direccionPropiedad(contrato?.propiedades),
      contrato?.propiedades?.codigo,
      nombreDueno(periodo),
    ];
    return campos.some((campo) => String(campo || '').toLowerCase().includes(texto));
  });

  const paginacion = usePaginacion(periodosFiltrados, `${filtros.mes || 'todos'}|${filtros.estado || ''}|${texto}`);

  const nombreEstado = filtros.estado === 'vencido'
    ? 'vencidos'
    : filtros.estado
      ? `${ESTADO_PERIODO_ALQUILER_LABELS[filtros.estado].toLowerCase()}s`
      : '';

  return (
    <div className="alquileres-page">
      <div className="page-header">
        <div className="al-encabezado-titulo">
          <span className="al-encabezado-icono"><Icon name="receipt" size={24} /></span>
          <div>
            <h1>Alquileres</h1>
            <p className="page-subtitle">Gestión y seguimiento de alquileres</p>
          </div>
        </div>
      </div>

      {resumenCargado && (
        <div className="al-kpis">
          {resumen.mesEnCurso && (
            <button
              type="button"
              className={`al-kpi${kpiMesActivo ? ' is-activo' : ''}`}
              onClick={() => setFiltros({ mes: resumen.mesEnCurso, estado: 'pendiente' })}
            >
              <span className="al-kpi-icono"><Icon name="receipt" size={18} /></span>
              <strong>{resumen.pendientesMes}</strong>
              <span className="al-kpi-titulo">Pendientes de Pago</span>
              <small>{etiquetaMes(resumen.mesEnCurso)}</small>
            </button>
          )}
          <button
            type="button"
            className={`al-kpi${resumen.vencidos > 0 ? ' es-alerta' : ' es-ok'}${kpiVencidosActivo ? ' is-activo' : ''}`}
            onClick={() => setFiltros({ mes: null, estado: 'vencido' })}
          >
            <span className="al-kpi-icono"><Icon name="alert" size={18} /></span>
            <strong>{resumen.vencidos}</strong>
            <span className="al-kpi-titulo">Pendientes de otros meses</span>
            <small>{resumen.vencidos > 0 ? 'Ya vencidos: hay que reclamarlos' : 'No hay cobros atrasados'}</small>
          </button>
        </div>
      )}

      <div className="page-filters">
        <input
          type="text"
          placeholder="Buscar por inquilino, inmueble, código o propietario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input"
        />

        <SelectorPeriodo
          periodo={periodoElegido}
          vigente={vigente}
          onChange={({ anio, mes }) => cambiarFiltro('mes', `${anio}-${String(mes).padStart(2, '0')}`)}
        />

        <select className="filter-select" aria-label="Estado" value={filtros.estado || ''} onChange={(e) => cambiarFiltro('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="vencido">Vencidos</option>
          <option value="pagado">Pagados</option>
        </select>

        {hayFiltros && (
          <Button variant="secondary" size="small" onClick={limpiarFiltros}>Limpiar filtros</Button>
        )}
      </div>

      {loading && <div className="page-loading">Cargando períodos...</div>}
      {error && (
        <div className="page-error">
          Error: {error}
          <Button size="small" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      {!loading && !error && periodosFiltrados.length === 0 && (
        <div className="page-empty">
          <p>
            {texto
              ? 'No se encontraron cobros con ese criterio.'
              : `No hay cobros${nombreEstado ? ` ${nombreEstado}` : ''}${filtros.mes ? ` en ${etiquetaMes(filtros.mes)}` : ''}.`}
          </p>
          <p className="page-empty-help">
            Cambiá el mes, el estado o la búsqueda para ver otros períodos.
          </p>
        </div>
      )}

      {!loading && !error && periodosFiltrados.length > 0 && (
        <div className="alquileres-tabla-wrapper">
          <table className="alquileres-tabla">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Período</th>
                <th>Vencimiento</th>
                <th>Inquilino</th>
                <th>Inmueble</th>
                <th>Propietario</th>
                <th className="al-monto">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((periodo) => {
                const contrato = periodo.contratos;
                const inquilino = contrato?.inquilinos;
                const propiedad = contrato?.propiedades;
                const aviso = etiquetaVencimiento(periodo);
                const vencido = aviso?.tono === 'vencido';
                return (
                  <tr key={periodo.id} className="al-fila" onClick={() => setPeriodoSeleccionado(periodo)}>
                    <td>
                      {vencido ? (
                        <span className="estado-tag al-vencido">Vencido</span>
                      ) : (
                        <span className={`estado-tag estado-${periodo.estado}`}>
                          {ESTADO_PERIODO_ALQUILER_LABELS[periodo.estado]}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="al-principal">{etiquetaPeriodo(periodo)}</div>
                      <div className="al-secundaria">
                        {formatearFecha(periodo.fecha_desde)} → {formatearFecha(periodo.fecha_hasta)}
                      </div>
                    </td>
                    <td>
                      <div className="al-principal">{formatearFecha(periodo.fecha_vencimiento)}</div>
                      {aviso && <span className={`al-chip al-chip-${aviso.tono}`}>{aviso.texto}</span>}
                    </td>
                    <td>
                      <div className="al-principal dato-clave">{nombreInquilino(inquilino)}</div>
                      {inquilino?.documento && (
                        <span className="al-pildora">
                          {inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {inquilino.documento}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="al-principal">
                        {propiedad?.codigo && <><span className="al-codigo">{propiedad.codigo}</span> - </>}
                        {direccionPropiedad(propiedad)}
                      </div>
                      <div className="al-secundaria">
                        Contrato {ESTADO_CONTRATO_LABELS[contrato?.estado] || '—'}
                      </div>
                    </td>
                    <td>{nombreDueno(periodo)}</td>
                    <td className="al-monto">
                      <strong>{formatearMonto(periodo.monto)}</strong>
                      {faltaAplicarAumento(periodo) && (
                        <div
                          className="al-aviso-aumento"
                          title="Hay que confirmar el aumento en el módulo Aumentos antes de cobrar este período."
                        >
                          <Icon name="trend" size={13} />
                          Aumento pendiente
                        </div>
                      )}
                    </td>
                    <td>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={(evento) => {
                          evento.stopPropagation();
                          setPeriodoSeleccionado(periodo);
                        }}
                      >
                        <Icon name="eye" size={15} />
                        Ver
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

      {periodoSeleccionado && (
        <Modal
          isOpen
          onClose={() => setPeriodoSeleccionado(null)}
          title="Detalle del período"
          icon={<Icon name="receipt" size={22} />}
          size="large"
          tall
        >
          <PeriodoDetalle
            periodoId={periodoSeleccionado.id}
            onCerrar={() => setPeriodoSeleccionado(null)}
            onActualizado={recargarTodo}
          />
        </Modal>
      )}
    </div>
  );
}
