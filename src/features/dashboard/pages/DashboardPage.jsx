import { Link } from 'react-router-dom';
import { CATEGORIA_RECLAMO_LABELS, PRIORIDAD_RECLAMO_LABELS } from '../../../constants/estados';
import { direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Button } from '../../../shared/components/Button';
import { Encabezado } from '../../../shared/components/Encabezado';
import { Icon } from '../../../shared/components/Icons';
import { formatearFecha } from '../../propiedades/utils';
import { GraficoIPC } from '../components/GraficoIPC';
import { useDashboard } from '../hooks/useDashboard';
import '../../../shared/styles/detalle.css';
import '../../reclamos/components/ReclamoDetalle.css';
import './DashboardPage.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function diasHasta(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(anio, mes - 1, dia) - hoy) / (24 * 60 * 60 * 1000));
}

function etiquetaDias(dias) {
  if (dias < 0) return 'Vencido';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `En ${dias} días`;
}

function fechaDeHoy() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function inmueble(propiedad) {
  if (!propiedad) return '';
  return [propiedad.codigo, direccionPropiedad(propiedad)].filter(Boolean).join(' - ');
}

export function DashboardPage() {
  const { indicadores, contratos, reclamos, ipc, loading, error, errorIpc, recargar } = useDashboard();
  const ultimoIpc = ipc[ipc.length - 1];

  // "tono" avisa si hay algo para atender; en cero queda en verde.
  const tarjetas = indicadores ? [
    { titulo: 'Propiedades', ayuda: 'En administración', valor: indicadores.propiedades, icono: 'building', destino: '/app/propiedades' },
    { titulo: 'Contratos activos', ayuda: 'Vigentes hoy', valor: indicadores.contratosActivos, icono: 'file', destino: '/app/contratos' },
    { titulo: 'Por vencer', ayuda: 'En los próximos 60 días', valor: indicadores.contratosPorVencer, icono: 'calendar', destino: '/app/contratos', tono: 'alerta' },
    { titulo: 'Aumentos por confirmar', ayuda: 'Pendientes de confirmar', valor: indicadores.aumentosPendientes, icono: 'trend', destino: '/app/aumentos', tono: 'alerta' },
    { titulo: 'Reclamos pendientes', ayuda: 'Sin gestionar', valor: indicadores.reclamosPendientes, icono: 'alert', destino: '/app/reclamos', tono: 'alerta' },
  ] : [];

  return (
    <section className="dashboard-page ls-pagina">
      <Encabezado icono="dashboard" titulo="Dashboard" subtitulo="Resumen general y temas para atender">
        <span className="cd-vigencia">
          <Icon name="calendar" size={16} />
          {fechaDeHoy()}
        </span>
      </Encabezado>

      {error && (
        <div className="page-error">
          <p>{error}</p>
          <Button size="small" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      {loading && <div className="page-loading">Cargando el panel...</div>}

      {!loading && !error && indicadores && (
        <>
          <div className="db-indicadores">
            {tarjetas.map((tarjeta) => {
              const tono = tarjeta.tono ? (tarjeta.valor > 0 ? tarjeta.tono : 'ok') : 'info';
              return (
                <Link key={tarjeta.titulo} className={`db-kpi db-${tono}`} to={tarjeta.destino} state={tarjeta.estado}>
                  <span className="db-kpi-icono"><Icon name={tarjeta.icono} size={18} /></span>
                  <strong>{tarjeta.valor}</strong>
                  <span className="db-kpi-titulo">{tarjeta.titulo}</span>
                  <small>{tarjeta.ayuda}</small>
                </Link>
              );
            })}
          </div>

          <div className="db-listas">
            <Panel titulo="Reclamos pendientes" icono="alert" cantidad={indicadores.reclamosPendientes} destino="/app/reclamos" enlace="Ver reclamos">
              {reclamos.length === 0 ? (
                <Vacio texto="No hay reclamos pendientes." />
              ) : (
                <ul className="db-lista">
                  {reclamos.map((reclamo) => (
                    <li key={reclamo.id}>
                      <Link to="/app/reclamos">
                        <div>
                          <strong>{reclamo.titulo}</strong>
                          <span>{nombreInquilino(reclamo.contratos?.inquilinos)} · {inmueble(reclamo.contratos?.propiedades)}</span>
                          <span>{CATEGORIA_RECLAMO_LABELS[reclamo.categoria]} · {formatearFecha(reclamo.creado_en)}</span>
                        </div>
                        <span className={`estado-tag rc-prioridad-${reclamo.prioridad}`}>
                          {PRIORIDAD_RECLAMO_LABELS[reclamo.prioridad]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel titulo="Contratos próximos a finalizar" icono="calendar" cantidad={indicadores.contratosPorVencer} destino="/app/contratos" enlace="Ver contratos">
              {contratos.length === 0 ? (
                <Vacio texto="Ningún contrato activo vence en los próximos 60 días." />
              ) : (
                <ul className="db-lista">
                  {contratos.map((contrato) => (
                    <li key={contrato.id}>
                      <Link to="/app/contratos">
                        <div>
                          <strong>{nombreInquilino(contrato.inquilinos)}</strong>
                          <span>{inmueble(contrato.propiedades)}</span>
                          <span>Finaliza el {formatearFecha(contrato.fecha_fin)}</span>
                        </div>
                        <span className="estado-tag rc-prioridad-media">{etiquetaDias(diasHasta(contrato.fecha_fin))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <article className="db-panel">
            <header className="db-panel-encabezado">
              <div>
                <span className="db-panel-icono"><Icon name="trend" size={18} /></span>
                <h2>Evolución mensual del IPC</h2>
              </div>
              {ultimoIpc && (
                <span className="db-panel-dato">
                  Último publicado: <strong>{Number(ultimoIpc.valor).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %</strong>
                  {' '}({MESES[ultimoIpc.mes - 1]} {ultimoIpc.anio})
                </span>
              )}
            </header>
            {errorIpc && <Vacio texto={errorIpc} />}
            {!errorIpc && ipc.length === 0 && <Vacio texto="No hay valores de IPC para mostrar." />}
            {!errorIpc && ipc.length > 0 && <GraficoIPC serie={ipc} />}
          </article>
        </>
      )}
    </section>
  );
}

function Panel({ titulo, icono, cantidad, destino, enlace, children }) {
  return (
    <article className="db-panel">
      <header className="db-panel-encabezado">
        <div>
          <span className="db-panel-icono"><Icon name={icono} size={18} /></span>
          <h2>{titulo}</h2>
          <span className="db-contador">{cantidad}</span>
        </div>
        <Link to={destino}>{enlace}</Link>
      </header>
      {children}
    </article>
  );
}

function Vacio({ texto }) {
  return <p className="db-vacio">{texto}</p>;
}
