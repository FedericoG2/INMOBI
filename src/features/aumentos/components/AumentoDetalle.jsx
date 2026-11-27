import { useState, useEffect } from 'react';
import { useAumentoDetalle } from '../hooks/useAumentos';
import { aumentosService, etiquetaPeriodoAumento, formatearMonto, nombreInquilino, direccionPropiedad, nombrePropietario, etiquetaMes } from '../../../services/aumentosService';
import { ESTADO_AUMENTO, ESTADO_AUMENTO_LABELS, TIPO_AJUSTE_LABELS, TIPO_PROPIEDAD_LABELS, ESTADO_CONTRATO_LABELS, PERIODICIDAD_AJUSTE_LABELS } from '../../../constants/estados';
import { contratosService } from '../../../services/contratosService';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { ResumenOperacion } from '../../../shared/components/ResumenOperacion';
import { useApiIndices } from '../hooks/useApiIndices';
import { soloDecimal } from '../../../shared/validaciones';
import '../../../shared/styles/forms.css';
import '../../../shared/components/SelectBuscable.css';
import { CalculoDetallado } from './CalculoDetallado';
import './AumentoDetalle.css';

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const [anio, mes, dia] = fecha.split('-');
  return dia ? `${dia}/${mes}/${anio}` : `${mes}/${anio}`;
}

function claveFaltante(faltante) {
  return typeof faltante === 'object' ? `ipc-${faltante.anio}-${faltante.mes}` : `icl-${faltante}`;
}

function etiquetaFaltante(faltante) {
  return typeof faltante === 'object' ? `${etiquetaMes(faltante.mes)} ${faltante.anio}` : formatearFecha(faltante);
}

const REDONDEOS = [
  { paso: 0, titulo: 'Sin redondeo' },
  { paso: 10, titulo: 'A la decena' },
  { paso: 100, titulo: 'A la centena' },
];

export function AumentoDetalle({ aumentoId, onCerrar, onActualizado }) {
  const { aumento, loading, error, recargar } = useAumentoDetalle(aumentoId);
  const [calculando, setCalculando] = useState(false);
  const [calculo, setCalculo] = useState(null);
  const [errorCalculo, setErrorCalculo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [accionError, setAccionError] = useState(null);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const [deshacerAbierto, setDeshacerAbierto] = useState(false);
  
  // null: todavía no se eligió y vale el redondeo guardado.
  const [redondeoElegido, setRedondeoElegido] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [valoresManuales, setValoresManuales] = useState({});
  
  // null mientras se consulta: hasta saberlo no se ofrece deshacer.
  const [periodosPagados, setPeriodosPagados] = useState(null);

  const toast = useToast();
  const api = useApiIndices();

  useEffect(() => {
    if (aumento?.estado !== ESTADO_AUMENTO.CONFIRMADO) return undefined;
    let vigente = true;
    contratosService.listarPeriodos(aumento.contrato_id).then((lista) => {
      if (!vigente) return;
      setPeriodosPagados(lista.filter((item) => item.estado === 'pagado' && (
        item.periodo_anio > aumento.aumento_anio
        || (item.periodo_anio === aumento.aumento_anio && item.periodo_mes >= aumento.aumento_mes)
      )));
    }).catch(() => {
      // Si la consulta falla, la base igual valida al intentar deshacer.
      if (vigente) setPeriodosPagados([]);
    });
    return () => {
      vigente = false;
    };
  }, [aumento]);

  useEffect(() => {
    if (aumento) {
      setObservaciones(aumento.observaciones || '');
      
      if (aumento.estado === ESTADO_AUMENTO.CONFIRMADO) {
        // Ya confirmado, mostrar valores guardados
        setCalculo({
          montoCalculado: parseFloat(aumento.monto_nuevo),
          detalle: aumento.calculo_detalle || {},
        });
      } else {
        // Pendiente: calcular
        calcularMonto();
      }
    }
  }, [aumento]);

  async function calcularMonto() {
    if (!aumento) return;
    
    setCalculando(true);
    setErrorCalculo(null);
    try {
      const resultado = await aumentosService.calcularMonto(aumento);
      setCalculo(resultado);
    } catch (err) {
      setErrorCalculo(err.message);
    } finally {
      setCalculando(false);
    }
  }

  // El monto solo se puede redondear a la decena o a la centena más cercana.
  const calculado = Number(calculo?.montoCalculado) || 0;
  const guardado = Number(aumento?.monto_calculado) || 0;
  const redondear = (paso) => (paso ? Math.round(calculado / paso) * paso : calculado);
  const redondeoGuardado = (guardado && guardado !== calculado
    && REDONDEOS.find((opcion) => opcion.paso && redondear(opcion.paso) === guardado)?.paso) || 0;
  const redondeo = redondeoElegido ?? redondeoGuardado;
  const montoAjustado = redondeo && calculado ? String(redondear(redondeo)) : '';
  const cambioRedondeo = Boolean(calculado) && redondear(redondeo) !== redondear(redondeoGuardado);

  async function handleGuardarCambios() {
    setProcesando(true);
    setAccionError(null);
    try {
      const actualizacion = {};
      
      // Sin redondeo se vuelve a usar el monto calculado.
      if (cambioRedondeo) actualizacion.monto_calculado = montoAjustado ? Number(montoAjustado) : null;
      
      if (observaciones !== aumento.observaciones) {
        actualizacion.observaciones = observaciones;
      }
      
      if (Object.keys(actualizacion).length > 0) {
        await aumentosService.actualizar(aumentoId, actualizacion);
        onActualizado?.({
          ...actualizacion,
          ...(cambioRedondeo && { monto_propuesto: montoAjustado ? Number(montoAjustado) : calculado }),
        });
        await recargar();
        toast.success('Cambios guardados');
      }
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmar() {
    setConfirmarAbierto(false);
    setProcesando(true);
    setAccionError(null);
    
    try {
      const montoNuevo = montoAjustado 
        ? parseFloat(montoAjustado)
        : (calculo?.montoCalculado || aumento.monto_calculado);
      
      if (!montoNuevo || montoNuevo <= 0) {
        throw new Error('Falta el monto nuevo del aumento');
      }
      
      if (observaciones !== (aumento.observaciones || '')) {
        await aumentosService.actualizar(aumentoId, { observaciones });
      }

      await aumentosService.confirmarConComprobante(aumento, {
        montoNuevo,
        detalle: calculo?.detalle,
        montoCalculado: calculo?.montoCalculado,
        observaciones,
      });
      toast.success(`Aumento confirmado: ${etiquetaPeriodoAumento(aumento)}. El comprobante quedó guardado.`);
      onActualizado?.({ estado: ESTADO_AUMENTO.CONFIRMADO, monto_nuevo: montoNuevo, monto_propuesto: montoNuevo, calculando: false });
      await recargar();
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleGuardarIndice(faltante) {
    const clave = claveFaltante(faltante);
    const valor = valoresManuales[clave];
    if (!valor) {
      setAccionError('Ingresá el valor del índice.');
      return;
    }
    setProcesando(true);
    setAccionError(null);
    try {
      const indice = typeof faltante === 'object'
        ? { tipo: 'ipc', anio: faltante.anio, mes: faltante.mes, valor }
        : { tipo: 'icl', fecha: faltante, valor };
      await aumentosService.guardarIndiceManual(indice);
      await calcularMonto();
      toast.success('Índice guardado. Se recalculó el aumento.');
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleDescargar() {
    setProcesando(true);
    setAccionError(null);
    try {
      const blob = await aumentosService.descargarComprobante(aumento.ruta_comprobante);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nombre = `Detalle de Aumento - ${nombreInquilino(aumento.contratos?.inquilinos)} - ${etiquetaPeriodoAumento(aumento)}`;
      // Se quitan los caracteres que Windows no admite en nombres de archivo.
      link.download = `${nombre.replace(/[\\/:*?"<>|]/g, '')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleDeshacer() {
    setDeshacerAbierto(false);
    setProcesando(true);
    setAccionError(null);
    
    try {
      await aumentosService.deshacer(aumentoId);
      toast.success('Aumento deshecho. Volvió a pendiente.');
      onActualizado?.({ estado: ESTADO_AUMENTO.PENDIENTE, monto_nuevo: null, monto_calculado: null, monto_propuesto: null, calculando: true });
      recargar();
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  if (loading) return <Modal isOpen onClose={onCerrar} title="Cargando..."><div className="modal-loading">Cargando aumento...</div></Modal>;
  if (error) return <Modal isOpen onClose={onCerrar} title="Error"><div className="modal-error">Error: {error}</div></Modal>;
  if (!aumento) return null;

  const contrato = aumento.contratos;
  const inquilino = contrato?.inquilinos;
  const propiedad = contrato?.propiedades;
  const propietario = propiedad?.propietarios;

  const esConfirmado = aumento.estado === ESTADO_AUMENTO.CONFIRMADO;
  const puedeConfirmar = !esConfirmado && calculo?.montoCalculado;
  const tienePagos = esConfirmado && periodosPagados?.length > 0;
  const puedeDeshacer = esConfirmado && periodosPagados?.length === 0 && aumentosService.puedeDeshacer(aumento);
  const esRezagado = aumentosService.esRezagado(aumento);

  const detalle = calculo?.detalle || {};
  const anterior = Number(aumento.monto_anterior);
  const montoNuevoVista = montoAjustado ? parseFloat(montoAjustado) : calculo?.montoCalculado;
  const variacion = anterior > 0 && montoNuevoVista > 0 ? ((montoNuevoVista / anterior) - 1) * 100 : null;
  // Al confirmar se guardan el monto que dio la cuenta y el que se aplicó.
  const montoOriginal = esConfirmado
    ? Number(detalle.montoCalculado) || (detalle.factor ? Math.round(anterior * detalle.factor) : 0)
    : calculado;
  const montoRedondeado = esConfirmado ? Number(aumento.monto_nuevo) : Number(montoAjustado) || 0;
  const diferencia = montoRedondeado - montoOriginal;
  const hayRedondeo = Boolean(montoOriginal && montoRedondeado) && (esConfirmado ? diferencia !== 0 : true);
  const pasoAplicado = esConfirmado
    ? [100, 10].find((paso) => Math.round(montoOriginal / paso) * paso === montoRedondeado)
    : redondeo;
  const porcentaje = (valor) => `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`;
  const resumen = `${nombreInquilino(inquilino)} · ${direccionPropiedad(propiedad)}`;
  const faltantes = !esConfirmado ? detalle.faltantes || [] : [];

  return (
    <Modal
      isOpen
      onClose={onCerrar}
      title="Detalle del aumento"
      icon={<Icon name="trend" size={22} />}
      size="large"
      tall
    >
      <div className="cd">
        <div className="cd-barra">
          <span className={`au-estado au-estado-${aumento.estado}`}>{ESTADO_AUMENTO_LABELS[aumento.estado]}</span>
          {esRezagado && <span className="au-estado au-estado-rezagado">Rezagado</span>}
          <span className="cd-vigencia">
            <Icon name="calendar" size={16} />
            {etiquetaPeriodoAumento(aumento)}
          </span>
        </div>

        {accionError && <div className="form-error-global">{accionError}</div>}

        <Tarjeta titulo="Resultado" icono={<Icon name="trend" size={18} />}>
          <dl className="cd-datos">
            <Dato etiqueta="Monto anterior">{formatearMonto(aumento.monto_anterior)}</Dato>
            <Dato etiqueta="Porcentaje de Aumento Aplicado">{variacion != null ? `+${porcentaje(variacion)}` : '—'}</Dato>
            <Dato etiqueta="Monto nuevo" destacado>
              {montoNuevoVista ? formatearMonto(montoNuevoVista) : calculando ? 'Calculando…' : '—'}
            </Dato>
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Contrato" icono={<Icon name="file" size={18} />}>
          <dl className="cd-datos">
            <Dato etiqueta="Inquilino">
              <span className="resumen-opcion">
                <span className="selectb-texto"><strong>{nombreInquilino(inquilino)}</strong></span>
                {inquilino?.documento && (
                  <span className="selectb-meta">
                    {inquilino.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} {inquilino.documento}
                  </span>
                )}
              </span>
            </Dato>
            <Dato etiqueta="Inmueble">
              <span className="resumen-opcion">
                <span className="selectb-avatar"><Icon name="building" size={16} /></span>
                <span className="selectb-texto">
                  <strong>{direccionPropiedad(propiedad)}</strong>
                  {propiedad?.tipo && <small>{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</small>}
                </span>
                {propiedad?.codigo && <span className="selectb-meta">{propiedad.codigo}</span>}
              </span>
            </Dato>
            <Dato etiqueta="Propietario">{nombrePropietario(propietario)}</Dato>
            <Dato etiqueta="Estado del contrato">{ESTADO_CONTRATO_LABELS[contrato?.estado] || '—'}</Dato>
            <Dato etiqueta="Ajuste">
              {TIPO_AJUSTE_LABELS[contrato?.tipo_ajuste]} · {PERIODICIDAD_AJUSTE_LABELS[contrato?.periodicidad_ajuste]}
            </Dato>
          </dl>
        </Tarjeta>

        <Tarjeta titulo="Cálculo del aumento" icono={<Icon name="receipt" size={18} />}>
          {calculando && <p className="cd-vacio">Calculando monto…</p>}
          {errorCalculo && <div className="form-error-global">{errorCalculo}</div>}

          {calculo && (
            <div className="ad-calculo">
              {detalle.fechaBase && (
                <p className="cd-vacio">
                  La cuenta arranca el {formatearFecha(detalle.fechaBase)}
                  {detalle.origenBase === 'aumento' ? ', fecha del aumento anterior.' : ', fecha de inicio del contrato.'}
                </p>
              )}

              <CalculoDetallado detalle={detalle} montoAnterior={anterior} montoCalculado={montoOriginal} />

              {hayRedondeo && (
                <div className="ad-redondeado" role="status">
                  <span>
                    {pasoAplicado === 100 && 'Redondeado a la centena'}
                    {pasoAplicado === 10 && 'Redondeado a la decena'}
                    {!pasoAplicado && 'Monto ajustado'}
                    <small>
                      {diferencia === 0
                        ? 'El monto ya era exacto'
                        : `${diferencia > 0 ? '+' : '−'} ${formatearMonto(Math.abs(diferencia))} sobre el calculado`}
                    </small>
                  </span>
                  <strong>{formatearMonto(montoRedondeado)}</strong>
                </div>
              )}

              {faltantes.length > 0 && (
                <div className="ad-faltantes">
                  <p>
                    {api.estado === 'falla'
                      ? 'No hay conexión con la API de índices. Cargalos a mano para recalcular.'
                      : 'Estos índices todavía no están publicados. El monto se calcula solo cuando estén disponibles.'}
                  </p>
                  {faltantes.map((faltante) => {
                    const clave = claveFaltante(faltante);
                    return (
                      <div className="ad-faltante" key={clave}>
                        <span>{etiquetaFaltante(faltante)}</span>
                        {api.estado === 'falla' && (<>
                        <input
                          inputMode="decimal"
                          value={valoresManuales[clave] || ''}
                          onChange={(event) => setValoresManuales((actual) => ({ ...actual, [clave]: soloDecimal(event.target.value) }))}
                          placeholder="Valor"
                          disabled={procesando}
                        />
                        <Button size="small" onClick={() => handleGuardarIndice(faltante)} disabled={procesando}>
                          Guardar
                        </Button>
                        </>)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Tarjeta>

        {(!esConfirmado || aumento.observaciones) && (
          <Tarjeta titulo={esConfirmado ? 'Observaciones' : 'Ajustes y observaciones'} icono={<Icon name="edit" size={18} />}>
            {esConfirmado ? (
              <p className="ad-observaciones">{aumento.observaciones}</p>
            ) : (
              <div className="form-section ad-formulario">
                {calculo?.montoCalculado && (
                  <div className="form-group">
                    <span className="ad-redondeo-titulo" id="redondeo_aumento">Redondeo del monto nuevo</span>
                    <div className="ad-redondeo" role="radiogroup" aria-labelledby="redondeo_aumento">
                      {REDONDEOS.map((opcion) => (
                        <button
                          key={opcion.paso}
                          type="button"
                          role="radio"
                          aria-checked={redondeo === opcion.paso}
                          className={redondeo === opcion.paso ? 'is-elegido' : undefined}
                          onClick={() => setRedondeoElegido(opcion.paso)}
                          disabled={procesando}
                        >
                          <small>{opcion.titulo}</small>
                          <strong>{formatearMonto(redondear(opcion.paso))}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="observaciones_aumento">Observaciones</label>
                  <textarea
                    id="observaciones_aumento"
                    rows="2"
                    className="textarea-compact"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    disabled={procesando}
                  />
                </div>
              </div>
            )}
          </Tarjeta>
        )}

        {!puedeConfirmar && !esConfirmado && calculo && !calculo.montoCalculado && (
          <div className="cd-info cd-info-warning" role="note">
            <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
            <p>No se puede confirmar hasta que estén disponibles todos los índices necesarios.</p>
          </div>
        )}

        {tienePagos && (
          <div className="cd-info" role="note">
            <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
            <p>No se puede deshacer porque ya se encuentra pagado el período.</p>
          </div>
        )}

        <div className="cd-acciones ad-acciones">
          <Button variant="secondary" onClick={onCerrar} disabled={procesando}>
            Cerrar
          </Button>

          {!esConfirmado && (
            <>
              {(cambioRedondeo || observaciones !== (aumento.observaciones || '')) && (
                <Button variant="secondary" onClick={handleGuardarCambios} disabled={procesando || !calculo?.montoCalculado}>
                  Guardar cambios
                </Button>
              )}
              <Button variant="success" onClick={() => setConfirmarAbierto(true)} disabled={!puedeConfirmar || procesando}>
                <Icon name="check" size={16} />
                Confirmar aumento
              </Button>
            </>
          )}

          {esConfirmado && aumento.ruta_comprobante && (
            <Button variant="secondary" onClick={handleDescargar} disabled={procesando}>
              <Icon name="download" size={16} />
              Descargar comprobante
            </Button>
          )}

          {puedeDeshacer && (
            <Button variant="danger" onClick={() => setDeshacerAbierto(true)} disabled={procesando}>
              Deshacer aumento
            </Button>
          )}
        </div>

        <ConfirmDialog
          isOpen={confirmarAbierto}
          title="Confirmar Aumento"
          icon={<Icon name="trend" size={22} />}
          size="medium"
          message="Revisá los datos antes de confirmar."
          confirmLabel="Confirmar Aumento"
          cancelLabel="Volver"
          variant="success"
          busy={procesando}
          onConfirm={handleConfirmar}
          onCancel={() => setConfirmarAbierto(false)}
        >
          <ResumenOperacion
            datos={[
              ['Inquilino', nombreInquilino(inquilino)],
              ['Propiedad', direccionPropiedad(propiedad)],
              ['Período', etiquetaPeriodoAumento(aumento)],
            ]}
            montos={[
              { etiqueta: 'Alquiler actual', valor: formatearMonto(aumento.monto_anterior) },
              {
                etiqueta: 'Alquiler nuevo',
                valor: formatearMonto(montoNuevoVista),
                detalle: variacion != null ? `+ ${porcentaje(variacion)}` : null,
                destacado: true,
              },
            ]}
            efectos={[
              { icono: 'file', texto: 'El contrato pasa a tener el nuevo monto.' },
              { icono: 'receipt', texto: 'Se genera y guarda el comprobante.' },
            ]}
          />
        </ConfirmDialog>

        <ConfirmDialog
          isOpen={deshacerAbierto}
          title="Deshacer Aumento"
          message={`Vas a deshacer el aumento de ${etiquetaPeriodoAumento(aumento)}: ${resumen}.`}
          warning="El contrato y los períodos pendientes vuelven al monto anterior."
          confirmLabel="Deshacer Aumento"
          cancelLabel="Volver"
          variant="danger"
          busy={procesando}
          onConfirm={handleDeshacer}
          onCancel={() => setDeshacerAbierto(false)}
        />
      </div>
    </Modal>
  );
}
