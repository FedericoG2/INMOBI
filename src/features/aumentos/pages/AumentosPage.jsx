import { useState } from 'react';
import { useAumentos } from '../hooks/useAumentos';
import { useApiIndices } from '../hooks/useApiIndices';
import { AumentoDetalle } from '../components/AumentoDetalle';
import { SelectorPeriodo } from '../components/SelectorPeriodo';
import { CargaIndices } from '../components/CargaIndices';
import { aumentosService, etiquetaPeriodoAumento, formatearMonto, nombreInquilino, direccionPropiedad } from '../../../services/aumentosService';
import { ESTADO_AUMENTO, ESTADO_AUMENTO_LABELS, TIPO_AJUSTE_LABELS } from '../../../constants/estados';
import { Icon } from '../../../shared/components/Icons';
import { Modal } from '../../../shared/components/Modal';
import { Paginacion, usePaginacion } from '../../../shared/components/Paginacion';
import '../../../shared/styles/forms.css';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import './AumentosPage.css';

export function AumentosPage() {
  // Sin elección manual se sigue el período vigente: cambia solo el día 11.
  const periodoVigente = aumentosService.obtenerPeriodoTrabajo();
  const [periodoElegido, setPeriodoElegido] = useState(null);
  const periodo = periodoElegido || periodoVigente;
  const esVigente = periodo.anio === periodoVigente.anio && periodo.mes === periodoVigente.mes;
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [aumentoSeleccionado, setAumentoSeleccionado] = useState(null);
  const [lote, setLote] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [mostrarIndices, setMostrarIndices] = useState(false);
  
  const { aumentos, loading, cambiandoPeriodo, error, recargar, actualizarFila } = useAumentos({
    anio: periodo.anio,
    mes: periodo.mes,
  });

  const toast = useToast();
  const api = useApiIndices();

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Los rezagados se arrastran solo al período vigente; en uno anterior se ve lo de ese mes.
  const delPeriodo = cambiandoPeriodo ? [] : aumentos.filter((a) => (
    esVigente || (a.aumento_anio === periodo.anio && a.aumento_mes === periodo.mes)
  ));
  const aumentosConEstado = delPeriodo.map(a => ({
    ...a,
    esRezagado: aumentosService.esRezagado(a),
  }));

  function handleCambiarPeriodo({ anio, mes }) {
    const esElVigente = anio === periodoVigente.anio && mes === periodoVigente.mes;
    setPeriodoElegido(esElVigente ? null : { anio, mes });
  }


  function handleVerDetalle(aumento) {
    setAumentoSeleccionado(aumento.id);
  }

  function handleActualizado(cambios) {
    if (cambios) actualizarFila(aumentoSeleccionado, cambios);
    recargar();
  }

  function handleCerrarDetalle() {
    setAumentoSeleccionado(null);
    recargar();
  }

  const sinConfirmar = aumentosConEstado.filter((a) => a.estado !== ESTADO_AUMENTO.CONFIRMADO);
  const listosTodos = sinConfirmar.filter((a) => a.monto_propuesto);
  const listosRevisados = listosTodos.filter((a) => a.estado === ESTADO_AUMENTO.REVISADO);
  const sinCalculo = sinConfirmar.length - listosTodos.length;
  // Mientras se calculan no se puede confirmar en lote.
  const calculandoMontos = sinConfirmar.some((a) => a.calculando);
  const revisados = sinConfirmar.filter((a) => a.estado === ESTADO_AUMENTO.REVISADO).length;
  const elegidosLote = lote === 'todos' ? listosTodos : listosRevisados;
  const sinRevisar = elegidosLote.filter((a) => a.estado !== ESTADO_AUMENTO.REVISADO).length;
  const aumentosVisibles = filtroEstado
    ? aumentosConEstado.filter((a) => a.estado === filtroEstado)
    : aumentosConEstado;
  // Solo se pagina la tabla: confirmar en lote sigue abarcando todos.
  const paginacion = usePaginacion(aumentosVisibles, `${periodo.anio}-${periodo.mes}|${filtroEstado || ''}`);

  async function handleConfirmarLote() {
    const elegidos = elegidosLote;
    setLote(null);
    setConfirmando(true);
    const fallidos = [];
    for (const aumento of elegidos) {
      try {
        await aumentosService.confirmarConComprobante(aumento, {
          montoNuevo: aumento.monto_propuesto,
          detalle: aumento.calculo_vista,
          montoCalculado: aumento.calculo_vista ? aumento.monto_propuesto : null,
        });
        actualizarFila(aumento.id, { estado: ESTADO_AUMENTO.CONFIRMADO, monto_nuevo: aumento.monto_propuesto });
      } catch (err) {
        fallidos.push(`${nombreInquilino(aumento.contratos?.inquilinos)}: ${err.message}`);
      }
    }
    recargar();
    setConfirmando(false);
    if (fallidos.length === 0) {
      toast.success(elegidos.length === 1 ? 'Aumento confirmado' : `${elegidos.length} aumentos confirmados`);
    } else {
      toast.error(`No se pudieron confirmar ${fallidos.length}: ${fallidos[0]}`);
    }
  }

  if (loading) return <div className="page-loading">Cargando aumentos...</div>;
  if (error) return <div className="page-error">Error: {error}</div>;

  const periodoTexto = `${meses[periodo.mes - 1]} ${periodo.anio}`;

  return (
    <div className="page aumentos-page">
      <div className="page-header">
        <div className="au-encabezado-titulo">
          <span className="au-encabezado-icono"><Icon name="trend" size={24} /></span>
          <div>
            <h1>Aumentos</h1>
            <p className="page-subtitle">Actualización de alquileres por IPC e ICL</p>
          </div>
        </div>
        <div className="au-encabezado-acciones">
          <SelectorPeriodo
            periodo={periodo}
            vigente={periodoVigente}
            onChange={handleCambiarPeriodo}
            disabled={confirmando}
          />
          <Button
            onClick={() => setMostrarIndices(true)}
            disabled={api.estado !== 'falla'}
            title={api.estado === 'falla' ? 'Carga manual de contingencia' : 'Solo se habilita si falla la API de índices'}
          >
            <Icon name="trend" size={16} />
            Cargar índices
          </Button>
        </div>
      </div>

      {/* Solo se avisa cuando los índices no se pueden traer. */}
      {api.estado === 'falla' && (
        <div className="au-api" role="alert">
          <span className="au-api-punto" aria-hidden="true" />
          <div className="au-api-texto">
            <strong>Sin conexión con la API de índices</strong>
            <small>La carga manual quedó habilitada como contingencia.</small>
          </div>
        </div>
      )}

      <div className="au-kpis">
        <div className={`au-kpi${sinConfirmar.length > 0 ? ' es-alerta' : ' es-ok'}`}>
          <span className="au-kpi-icono"><Icon name="trend" size={18} /></span>
          <strong>{sinConfirmar.length}</strong>
          <span className="au-kpi-titulo">Aumentos pendientes</span>
          <small>{periodoTexto}</small>
        </div>
        <div className="au-kpi es-revisado">
          <span className="au-kpi-icono"><Icon name="check" size={18} /></span>
          <strong>{revisados}</strong>
          <span className="au-kpi-titulo">Revisados</span>
          <small>{periodoTexto}</small>
        </div>
      </div>

      <div className="au-barra">
        <select
          className="filter-select"
          aria-label="Estado"
          value={filtroEstado || ''}
          onChange={(e) => setFiltroEstado(e.target.value || null)}
        >
          <option value="">Todos los estados</option>
          <option value={ESTADO_AUMENTO.PENDIENTE}>Pendientes</option>
          <option value={ESTADO_AUMENTO.REVISADO}>Revisados</option>
          <option value={ESTADO_AUMENTO.CONFIRMADO}>Confirmados</option>
        </select>
        <div className="au-barra-accion">
          <Button
            variant="outline"
            disabled={listosRevisados.length === 0 || confirmando || calculandoMontos}
            onClick={() => setLote('revisados')}
          >
            Confirmar revisados ({listosRevisados.length})
          </Button>
          <Button
            variant="success"
            disabled={listosTodos.length === 0 || confirmando || calculandoMontos}
            onClick={() => setLote('todos')}
          >
            <Icon name="check" size={16} />
            {confirmando ? 'Confirmando...' : `Confirmar todos (${listosTodos.length})`}
          </Button>
        </div>
      </div>

      {cambiandoPeriodo ? (
        <div className="page-loading">Cargando aumentos...</div>
      ) : aumentosVisibles.length === 0 ? (
        <div className="empty-state">
          <p>
            {filtroEstado
              ? `No hay aumentos ${ESTADO_AUMENTO_LABELS[filtroEstado].toLowerCase()}s en ${periodoTexto}.`
              : `No hay aumentos en ${periodoTexto}.`}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table au-tabla">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Período</th>
                <th>Inquilino</th>
                <th>Inmueble</th>
                <th>Índice</th>
                <th className="au-num">Monto actual</th>
                <th className="au-centro">Variación</th>
                <th className="au-num">Monto calculado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginacion.visibles.map((aumento) => {
                const contrato = aumento.contratos;
                const inquilino = contrato?.inquilinos;
                const propiedad = contrato?.propiedades;
                const anterior = Number(aumento.monto_anterior);
                const nuevo = Number(aumento.monto_propuesto);
                const variacion = anterior > 0 && nuevo > 0 ? ((nuevo / anterior) - 1) * 100 : null;
                const claseEstado = aumento.esRezagado ? 'rezagado' : aumento.estado;

                return (
                  <tr key={aumento.id} className="au-fila" onClick={() => handleVerDetalle(aumento)}>
                    <td>
                      <span className={`au-estado au-estado-${claseEstado}`}>
                        {aumento.esRezagado ? 'Rezagado' : ESTADO_AUMENTO_LABELS[aumento.estado]}
                      </span>
                    </td>
                    <td className="au-principal">{etiquetaPeriodoAumento(aumento)}</td>
                    <td>
                      <div className="au-principal dato-clave">{nombreInquilino(inquilino)}</div>
                      {inquilino?.documento && (
                        <span className="au-pildora">
                          {inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {inquilino.documento}
                        </span>
                      )}
                    </td>
                    <td className="au-principal">
                      {propiedad?.codigo && <><span className="au-codigo">{propiedad.codigo}</span> - </>}
                      {direccionPropiedad(propiedad)}
                    </td>
                    <td><span className="au-pildora">{TIPO_AJUSTE_LABELS[contrato?.tipo_ajuste]}</span></td>
                    <td className="au-num">{formatearMonto(aumento.monto_anterior)}</td>
                    <td className="au-centro">
                      {variacion != null ? (
                        <span className="au-variacion">+{variacion.toLocaleString('es-AR', { maximumFractionDigits: 2 })} %</span>
                      ) : '—'}
                    </td>
                    <td className="au-num">
                      {aumento.calculando
                        ? <span className="au-calculando">Calculando…</span>
                        : <strong>{formatearMonto(aumento.monto_propuesto)}</strong>}
                    </td>
                    <td>
                      <Button
                        size="small"
                        variant={aumento.estado === ESTADO_AUMENTO.PENDIENTE ? 'primary' : 'secondary'}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleVerDetalle(aumento);
                        }}
                      >
                        <Icon name="eye" size={15} />
                        {aumento.estado === ESTADO_AUMENTO.PENDIENTE ? 'Revisar' : 'Ver'}
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

      {aumentoSeleccionado && (
        <AumentoDetalle
          aumentoId={aumentoSeleccionado}
          onCerrar={handleCerrarDetalle}
          onActualizado={handleActualizado}
        />
      )}

      <Modal
        isOpen={mostrarIndices}
        onClose={() => setMostrarIndices(false)}
        title="Cargar índices faltantes"
        icon={<Icon name="receipt" size={22} />}
      >
        {mostrarIndices && (
          <CargaIndices
            aumentos={sinConfirmar}
            calculando={calculandoMontos || cambiandoPeriodo}
            periodoTexto={periodoTexto}
            onCerrar={() => setMostrarIndices(false)}
            onGuardado={(completos) => {
              if (completos) setMostrarIndices(false);
              recargar();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!lote}
        title={lote === 'todos' ? 'Confirmar Todos los Aumentos' : 'Confirmar Aumentos Revisados'}
        message={lote === 'todos'
          ? `Vas a confirmar ${elegidosLote.length} ${elegidosLote.length === 1 ? 'aumento pendiente' : 'aumentos pendientes'}.`
          : `Vas a confirmar ${elegidosLote.length} ${elegidosLote.length === 1 ? 'aumento revisado' : 'aumentos revisados'}.`}
        warning={[
          lote === 'todos' && sinRevisar > 0
            ? `Atención: ${sinRevisar === 1 ? '1 aumento todavía no fue revisado' : `${sinRevisar} aumentos todavía no fueron revisados`}.`
            : null,
          lote === 'todos' && sinCalculo > 0
            ? `${sinCalculo === 1 ? '1 aumento queda' : `${sinCalculo} aumentos quedan`} afuera porque faltan índices.`
            : null,
        ].filter(Boolean).join(' ') || undefined}
        confirmLabel={lote === 'todos' ? 'Confirmar Todos' : 'Confirmar Revisados'}
        cancelLabel="Volver"
        variant="success"
        busy={confirmando}
        onConfirm={handleConfirmarLote}
        onCancel={() => setLote(null)}
      >
        <ul className="au-efectos">
          <li>
            <span className="au-efectos-icono"><Icon name="file" size={16} /></span>
            <div><strong>Contratos</strong><small>Pasan a tener el nuevo monto de alquiler.</small></div>
          </li>
          <li>
            <span className="au-efectos-icono"><Icon name="calendar" size={16} /></span>
            <div><strong>Períodos pendientes</strong><small>Se actualizan desde el mes del aumento.</small></div>
          </li>
          <li>
            <span className="au-efectos-icono"><Icon name="receipt" size={16} /></span>
            <div><strong>Comprobantes</strong><small>Se genera y guarda uno por cada aumento.</small></div>
          </li>
        </ul>
      </ConfirmDialog>
    </div>
  );
}
