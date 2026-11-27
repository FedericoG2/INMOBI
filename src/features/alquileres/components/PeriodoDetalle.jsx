import { useEffect, useState } from 'react';
import {
  ESTADO_CONTRATO_LABELS,
  ESTADO_PERIODO_ALQUILER,
  ESTADO_PERIODO_ALQUILER_LABELS,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';
import {
  alquileresService,
  etiquetaPeriodo,
  etiquetaVencimiento,
  faltaAplicarAumento,
  formatearFecha,
  formatearMonto,
  nombreDueno,
} from '../../../services/alquileresService';
import { calcularProximoAumento, contratosService, direccionPropiedad, nombreInquilino } from '../../../services/contratosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import { Icon } from '../../../shared/components/Icons';
import { ResumenOperacion } from '../../../shared/components/ResumenOperacion';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import { useToast } from '../../../shared/components/Toast';
import { usePeriodoDetalle } from '../hooks/useAlquileres';
import '../../../shared/styles/forms.css';
import '../../../shared/components/SelectBuscable.css';
import './PeriodoDetalle.css';

function extension(nombre) {
  const partes = String(nombre || '').split('.');
  return partes.length > 1 ? partes.pop().slice(0, 4).toUpperCase() : 'ARCH';
}

export function PeriodoDetalle({ periodoId, onCerrar, onActualizado }) {
  const { periodo, comprobantes, loading, error, recargar } = usePeriodoDetalle(periodoId);
  const [accionError, setAccionError] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const [deshacerAbierto, setDeshacerAbierto] = useState(false);
  const [comprobanteAEliminar, setComprobanteAEliminar] = useState(null);
  const [anterioresPendientes, setAnterioresPendientes] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (!periodo?.contrato_id || periodo.estado === ESTADO_PERIODO_ALQUILER.PAGADO) return undefined;
    let vigente = true;
    contratosService.listarPeriodos(periodo.contrato_id).then((lista) => {
      if (!vigente) return;
      setAnterioresPendientes(lista.filter((item) => item.estado !== 'pagado' && (
        item.periodo_anio < periodo.periodo_anio
        || (item.periodo_anio === periodo.periodo_anio && item.periodo_mes < periodo.periodo_mes)
      )));
    }).catch(() => {});
    return () => {
      vigente = false;
    };
  }, [periodo]);

  if (loading) return <div className="periodo-estado">Cargando período...</div>;
  if (error) return <div className="periodo-estado periodo-error">Error: {error}</div>;
  if (!periodo) return <div className="periodo-estado periodo-error">Período no encontrado</div>;

  // Pendiente o adeudado: todavía se puede cobrar.
  const pendiente = periodo.estado !== ESTADO_PERIODO_ALQUILER.PAGADO;
  const pagado = periodo.estado === ESTADO_PERIODO_ALQUILER.PAGADO;
  const faltaAumento = faltaAplicarAumento(periodo);
  const contrato = periodo.contratos;
  const inquilino = contrato?.inquilinos;
  const propiedad = contrato?.propiedades;
  const aviso = etiquetaVencimiento(periodo);
  const resumen = `${nombreInquilino(inquilino)} · ${direccionPropiedad(propiedad)}`;

  let textoAumento = null;
  if (pendiente && faltaAumento) {
    const [anio, mes] = calcularProximoAumento(contrato).split('-').map(Number);
    const mesAumento = etiquetaPeriodo({ periodo_anio: anio, periodo_mes: mes });
    textoAumento = anio === periodo.periodo_anio && mes === periodo.periodo_mes
      ? `En ${mesAumento} corresponde aplicar el aumento del contrato. Confirmalo en Aumentos antes de cobrar este período.`
      : `El aumento que correspondía en ${mesAumento} todavía no se aplicó. Confirmalo en Aumentos antes de cobrar ${etiquetaPeriodo(periodo)}.`;
  }

  let textoAnteriores = null;
  if (pendiente && anterioresPendientes.length > 0) {
    const cantidad = anterioresPendientes.length;
    const mostrados = anterioresPendientes.slice(0, 3).map(etiquetaPeriodo).join(', ');
    const resto = cantidad > 3 ? ` y ${cantidad - 3} más` : '';
    textoAnteriores = `Hay ${cantidad} período${cantidad === 1 ? '' : 's'} anterior${cantidad === 1 ? '' : 'es'} sin pagar: ${mostrados}${resto}.`;
  }

  async function handleSubirArchivos(archivos) {
    if (archivos.length === 0) return;

    setProcesando(true);
    setAccionError(null);
    const fallidos = [];
    let subidos = 0;

    for (const archivo of archivos) {
      try {
        await alquileresService.subirComprobante(periodoId, archivo);
        subidos += 1;
      } catch (err) {
        fallidos.push(`${archivo.name} (${err.message})`);
      }
    }

    try {
      await recargar();
      if (subidos === 1 && fallidos.length === 0) {
        toast.success(`Comprobante adjuntado correctamente: ${archivos[0].name}`);
      } else if (subidos > 0) {
        toast.success(`${subidos} comprobantes adjuntados correctamente`);
      }
      if (fallidos.length > 0) {
        setAccionError(`No se pudo adjuntar: ${fallidos.join('; ')}`);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function handleEliminar() {
    if (!comprobanteAEliminar) return;
    setProcesando(true);
    setAccionError(null);
    try {
      const nombre = comprobanteAEliminar.nombre_archivo;
      await alquileresService.eliminarComprobante(comprobanteAEliminar.id, comprobanteAEliminar.ruta_storage);
      setComprobanteAEliminar(null);
      await recargar();
      toast.success(`Comprobante eliminado: ${nombre}`);
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleDescargar(comprobante) {
    setAccionError(null);
    try {
      const blob = await alquileresService.descargarComprobante(comprobante.ruta_storage);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = comprobante.nombre_archivo;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setAccionError(err.message);
    }
  }

  async function handleConfirmar() {
    if (comprobantes.length === 0) {
      setAccionError('No se puede confirmar un pago sin al menos un comprobante adjunto.');
      return;
    }

    setConfirmarAbierto(false);
    setProcesando(true);
    setAccionError(null);
    try {
      await alquileresService.confirmarPago(periodoId);
      await recargar();
      toast.success(`Pago confirmado: ${etiquetaPeriodo(periodo)} · ${nombreInquilino(inquilino)}`);
      if (onActualizado) onActualizado();
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
      await alquileresService.deshacerPago(periodoId);
      await recargar();
      toast.success(`Pago deshecho: ${etiquetaPeriodo(periodo)} ya no figura como pagado`);
      if (onActualizado) onActualizado();
    } catch (err) {
      setAccionError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`estado-tag estado-${periodo.estado}`}>
          {ESTADO_PERIODO_ALQUILER_LABELS[periodo.estado]}
        </span>
        <span className="cd-vigencia">
          <Icon name="calendar" size={16} />
          {etiquetaPeriodo(periodo)}
        </span>
        {aviso && <span className={`al-chip al-chip-${aviso.tono}`}>{aviso.texto}</span>}
      </div>

      {accionError && <div className="form-error-global">{accionError}</div>}

      <Tarjeta titulo="Período" icono={<Icon name="calendar" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta="Desde">{formatearFecha(periodo.fecha_desde)}</Dato>
          <Dato etiqueta="Hasta">{formatearFecha(periodo.fecha_hasta)}</Dato>
          <Dato etiqueta="Vencimiento">{formatearFecha(periodo.fecha_vencimiento)}</Dato>
          <Dato etiqueta="Monto" destacado>{formatearMonto(periodo.monto)}</Dato>
          {periodo.confirmado_en && (
            <Dato etiqueta="Pago confirmado el">{new Date(periodo.confirmado_en).toLocaleString('es-AR')}</Dato>
          )}
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
          <Dato etiqueta="Propietario">{nombreDueno(periodo)}</Dato>
          <Dato etiqueta="Estado del contrato">{ESTADO_CONTRATO_LABELS[contrato?.estado] || '—'}</Dato>
          <Dato etiqueta="Vigencia">
            {formatearFecha(contrato?.fecha_inicio)} → {formatearFecha(contrato?.fecha_fin)}
          </Dato>
        </dl>
      </Tarjeta>

      <Tarjeta
        titulo="Comprobantes"
        icono={<Icon name="receipt" size={18} />}
        contador={comprobantes.length}
      >
        {comprobantes.length === 0 ? (
          <p className="cd-vacio">Todavía no hay comprobantes cargados.</p>
        ) : (
          <ul className="cd-docs">
            {comprobantes.map((comprobante) => {
              const ext = extension(comprobante.nombre_archivo);
              const detalle = [
                comprobante.monto_informado ? formatearMonto(comprobante.monto_informado) : null,
                comprobante.fecha_pago_informada ? `Pago ${formatearFecha(comprobante.fecha_pago_informada)}` : null,
                `Subido ${new Date(comprobante.subido_en).toLocaleString('es-AR')}`,
              ].filter(Boolean).join(' · ');
              return (
                <li key={comprobante.id} className="cd-doc">
                  <span className={`cd-doc-ext${ext === 'PDF' ? ' es-pdf' : ''}`}>{ext}</span>
                  <span className="cd-doc-info">
                    <strong title={comprobante.nombre_archivo}>{comprobante.nombre_archivo}</strong>
                    <small>{detalle}</small>
                    {comprobante.observaciones && <small>{comprobante.observaciones}</small>}
                  </span>
                  <button
                    type="button"
                    className="cd-icono-btn"
                    onClick={() => handleDescargar(comprobante)}
                    title="Descargar"
                    aria-label={`Descargar ${comprobante.nombre_archivo}`}
                  >
                    <Icon name="download" size={16} />
                  </button>
                  {pendiente && (
                    <button
                      type="button"
                      className="cd-icono-btn cd-peligro"
                      disabled={procesando}
                      onClick={() => setComprobanteAEliminar(comprobante)}
                      title="Eliminar"
                      aria-label={`Eliminar ${comprobante.nombre_archivo}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {pendiente && (
          <div className="cd-adjuntar">
            <p className="cd-adjuntar-titulo">Adjuntar comprobante</p>
            <SubirArchivos
              id="archivo"
              multiple
              max={5}
              mostrarContador={false}
              value={[]}
              onChange={handleSubirArchivos}
              disabled={procesando}
            />
            <p className="cd-adjuntar-ayuda">
              {procesando
                ? 'Subiendo…'
                : 'Se adjunta apenas elegís o arrastrás el archivo. Si te equivocás, lo quitás con el ícono de la papelera.'}
            </p>
          </div>
        )}
      </Tarjeta>

      {textoAnteriores && (
        <div className="cd-info cd-info-warning" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>{textoAnteriores} Podés confirmar este período igual, pero revisá que sea el que corresponde.</p>
        </div>
      )}
      {pendiente && faltaAumento && (
        <div className="cd-info cd-info-warning" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>{textoAumento}</p>
        </div>
      )}
      {pendiente && !faltaAumento && comprobantes.length === 0 && (
        <div className="cd-info" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <p>Para confirmar el pago primero tenés que adjuntar al menos un comprobante.</p>
        </div>
      )}

      <div className="detalle-acciones cd-acciones">
        <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
        {pendiente && (
          <Button
            variant="success"
            onClick={() => setConfirmarAbierto(true)}
            disabled={procesando || faltaAumento || comprobantes.length === 0}
          >
            <Icon name="check" size={16} />
            Confirmar pago
          </Button>
        )}
        {pagado && (
          <Button variant="danger" onClick={() => setDeshacerAbierto(true)} disabled={procesando}>
            Deshacer pago
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmarAbierto}
        title="Confirmar Pago"
        icon={<Icon name="receipt" size={22} />}
        size="medium"
        message="Revisá los datos antes de confirmar."
        warning={textoAnteriores ? `Atención: ${textoAnteriores}` : undefined}
        confirmLabel="Confirmar Pago"
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
            ['Período', etiquetaPeriodo(periodo)],
          ]}
          montos={[{ etiqueta: 'Monto a cobrar', valor: formatearMonto(periodo.monto), destacado: true }]}
          efectos={[
            { icono: 'check', texto: 'El período pasa a estado Pagado.' },
            {
              icono: 'clip',
              texto: `${comprobantes.length} comprobante${comprobantes.length === 1 ? '' : 's'} adjunto${comprobantes.length === 1 ? '' : 's'}.`,
            },
          ]}
        />
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={deshacerAbierto}
        title="Deshacer Pago"
        message={`Vas a deshacer el pago de ${etiquetaPeriodo(periodo)}: ${resumen}.`}
        warning="El período vuelve a Pendiente o, si ya venció, a Adeudado. Los comprobantes se conservan."
        confirmLabel="Deshacer Pago"
        cancelLabel="Volver"
        variant="danger"
        busy={procesando}
        onConfirm={handleDeshacer}
        onCancel={() => setDeshacerAbierto(false)}
      />
      <ConfirmDialog
        isOpen={!!comprobanteAEliminar}
        title="Eliminar comprobante"
        message={`Vas a eliminar el comprobante "${comprobanteAEliminar?.nombre_archivo || ''}".`}
        warning="Se borra el archivo del sistema. Esta acción no se puede deshacer."
        confirmLabel="Eliminar comprobante"
        cancelLabel="Volver"
        busy={procesando}
        onConfirm={handleEliminar}
        onCancel={() => setComprobanteAEliminar(null)}
      />
    </div>
  );
}
