import { useEffect, useRef, useState } from 'react';
import { useContratoDetalle } from '../hooks/useContratos';
import { contratosService, nombreInquilino, direccionPropiedad, calcularProximoAumento, calendarioAumentos } from '../../../services/contratosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Modal } from '../../../shared/components/Modal';
import { useToast } from '../../../shared/components/Toast';
import {
  ESTADO_CONTRATO_LABELS,
  TIPO_AJUSTE_LABELS,
  PERIODICIDAD_AJUSTE_LABELS,
  MOTIVO_CIERRE,
  MOTIVO_CIERRE_LABELS,
  ESTADO_AUMENTO_LABELS,
  ESTADO_PERIODO_ALQUILER_LABELS,
  TIPO_PROPIEDAD_LABELS,
} from '../../../constants/estados';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function listaConY(elementos) {
  if (elementos.length <= 1) return elementos.join('');
  return `${elementos.slice(0, -1).join(', ')} y ${elementos[elementos.length - 1]}`;
}

function fechaHoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}
import { Icon } from '../../../shared/components/Icons';
import { Dato, Tarjeta } from '../../../shared/components/Detalle';
import '../../../shared/styles/forms.css';
import '../../../shared/components/SelectBuscable.css';
import './ContratoDetalle.css';
import { CierreContrato } from './CierreContrato';

export function ContratoDetalle({ contratoId, onCerrar, onActualizado }) {
  const { contrato, documentos, aumentos, periodos, eliminacion, loading, error, recargar } = useContratoDetalle(contratoId);
  const [modalAccion, setModalAccion] = useState(null);
  const [documentoAEliminar, setDocumentoAEliminar] = useState(null);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const tablaPagos = useRef(null);
  const menuAdjuntarRef = useRef(null);
  const inputArchivo = useRef(null);
  const adjuntaContrato = useRef(false);
  const [menuAdjuntar, setMenuAdjuntar] = useState(false);

  useEffect(() => {
    if (!menuAdjuntar) return undefined;
    const cerrarSiClickFuera = (evento) => {
      if (!menuAdjuntarRef.current?.contains(evento.target)) setMenuAdjuntar(false);
    };
    document.addEventListener('mousedown', cerrarSiClickFuera);
    return () => document.removeEventListener('mousedown', cerrarSiClickFuera);
  }, [menuAdjuntar]);

  useEffect(() => {
    const contenedor = tablaPagos.current;
    const fila = contenedor?.querySelector('[data-proximo="true"]');
    if (!contenedor || !fila) return;
    const encabezado = contenedor.querySelector('thead')?.offsetHeight || 0;
    contenedor.scrollTop = Math.max(fila.offsetTop - encabezado, 0);
  }, [periodos, loading]);

  if (loading) return <div className="contrato-detalle-loading">Cargando...</div>;
  if (error) return <div className="contrato-detalle-error">Error: {error}</div>;
  if (!contrato) return <div className="contrato-detalle-error">Contrato no encontrado</div>;

  function elegirAdjunto(esContrato) {
    adjuntaContrato.current = esContrato;
    setMenuAdjuntar(false);
    inputArchivo.current?.click();
  }

  async function handleSubirDocumento(e, esContrato = false) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    setUploading(true);
    try {
      await contratosService.subirDocumento(contratoId, archivo, esContrato);
      await recargar();
      toast.success(esContrato
        ? `Contrato adjuntado correctamente: ${archivo.name}`
        : `Documento subido correctamente: ${archivo.name}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleEliminarDocumento() {
    if (!documentoAEliminar) return;
    try {
      const nombre = documentoAEliminar.nombre_archivo;
      await contratosService.eliminarDocumento(documentoAEliminar.id, documentoAEliminar.ruta_storage);
      setDocumentoAEliminar(null);
      await recargar();
      toast.success(`Documento eliminado: ${nombre}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDescargar(doc) {
    try {
      const blob = await contratosService.descargarDocumento(doc.ruta_storage);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre_archivo;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleEliminarContrato() {
    setEliminando(true);
    try {
      await contratosService.eliminar(contratoId);
      setEliminarAbierto(false);
      toast.success(`Contrato eliminado: ${nombreInquilino(contrato.inquilinos)} · ${direccionPropiedad(contrato.propiedades)}`);
      if (onActualizado) onActualizado();
      onCerrar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEliminando(false);
    }
  }

  function abrirModalAccion(accion) {
    setModalAccion(accion);
  }

  async function handleAccion(accion, motivo, observaciones) {
    try {
      if (observaciones?.trim()) {
        const previa = contrato.observaciones ? `${contrato.observaciones}\n` : '';
        await contratosService.actualizar(contratoId, {
          observaciones: `${previa}Cierre: ${observaciones.trim()}`,
        });
      }
      if (accion === 'finalizar') {
        await contratosService.finalizar(contratoId, motivo);
      } else if (accion === 'cancelar') {
        await contratosService.cancelar(contratoId, motivo);
      } else if (accion === 'rescindir') {
        await contratosService.rescindir(contratoId, motivo);
      }
      setModalAccion(null);
      await recargar();
      if (onActualizado) onActualizado();
      const mensajes = {
        finalizar: 'Contrato finalizado correctamente',
        rescindir: 'Contrato rescindido correctamente',
        cancelar: 'Contrato cancelado correctamente',
      };
      toast.success(mensajes[accion] || 'Contrato actualizado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const proximoAumento = calcularProximoAumento(contrato);
  const cronograma = calendarioAumentos({
    fechaInicio: contrato.fecha_inicio,
    fechaFin: contrato.fecha_fin,
    periodicidad: contrato.periodicidad_ajuste,
  });

  const puedeEditarDocumentos = !['finalizado', 'cancelado', 'rescindido'].includes(contrato.estado);
  const asociados = eliminacion.asociados || [];
  let avisoEliminar = null;
  if (contrato.estado === 'programado') {
    avisoEliminar = (
      <>
        <strong>Para eliminar este contrato hay que cancelarlo primero</strong>
        <ol>
          <li>
            <b>Cancelar contrato:</b> lo deja sin efecto antes de que comience. La propiedad vuelve a estar
            disponible y el contrato queda en el historial como Cancelado.
          </li>
          <li>
            <b>Eliminar contrato:</b> el botón aparece una vez cancelado. Lo borra definitivamente, siempre que
            no tenga pagos, comprobantes ni reclamos.
          </li>
        </ol>
      </>
    );
  } else if (asociados.length > 0) {
    avisoEliminar = `Este contrato no se puede eliminar por tener asociados: ${listaConY(asociados)}.`;
  } else if (contrato.estado === 'rescindido') {
    avisoEliminar = 'Un contrato rescindido no se puede eliminar.';
  }

  const tieneContrato = documentos.some((doc) => doc.es_contrato_firmado);
  const documentosOrdenados = [...documentos].sort(
    (a, b) => Number(b.es_contrato_firmado) - Number(a.es_contrato_firmado),
  );
  const hoy = fechaHoyISO();
  const indiceProximo = periodos.findIndex((periodo) => periodo.estado !== 'pagado');
  const pagados = periodos.filter((periodo) => periodo.estado === 'pagado').length;
  const vencidos = periodos.filter((periodo) => periodo.estado === 'pendiente' && periodo.fecha_vencimiento < hoy).length;
  const inquilino = contrato.inquilinos;
  const propiedad = contrato.propiedades;

  return (
    <div className="cd">
      <div className="cd-barra">
        <span className={`estado-badge estado-${contrato.estado}`}>
          {ESTADO_CONTRATO_LABELS[contrato.estado]}
        </span>
        <span className="cd-vigencia">
          <Icon name="calendar" size={16} />
          {formatearFecha(contrato.fecha_inicio)} → {formatearFecha(contrato.fecha_fin)}
        </span>
      </div>

      <Tarjeta titulo="Partes" icono={<Icon name="users" size={18} />}>
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
          <Dato etiqueta="Propiedad">
            <span className="resumen-opcion">
              <span className="selectb-avatar"><Icon name="building" size={16} /></span>
              <span className="selectb-texto">
                <strong>{direccionPropiedad(propiedad)}</strong>
                {propiedad?.tipo && <small>{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</small>}
              </span>
              {propiedad?.codigo && <span className="selectb-meta">{propiedad.codigo}</span>}
            </span>
          </Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo="Condiciones" icono={<Icon name="trend" size={18} />}>
        <dl className="cd-datos">
          <Dato etiqueta="Monto inicial">{formatearMonto(contrato.monto_inicial)}</Dato>
          <Dato etiqueta="Monto actual" destacado>{formatearMonto(contrato.monto_actual)}</Dato>
          <Dato etiqueta="Pago del alquiler">Hasta el día {contrato.dia_vencimiento_pago} del mes siguiente</Dato>
          <Dato etiqueta="Tipo de ajuste">{TIPO_AJUSTE_LABELS[contrato.tipo_ajuste]}</Dato>
          <Dato etiqueta="Periodicidad">{PERIODICIDAD_AJUSTE_LABELS[contrato.periodicidad_ajuste]}</Dato>
          {proximoAumento && <Dato etiqueta="Próximo aumento">{formatearFecha(proximoAumento)}</Dato>}
          {contrato.observaciones && <Dato etiqueta="Observaciones" ancho>{contrato.observaciones}</Dato>}
        </dl>
      </Tarjeta>

      <Tarjeta
        titulo="Historial de pagos"
        icono={<Icon name="receipt" size={18} />}
        contador={periodos.length > 0 ? periodos.length : null}
        accion={periodos.length > 0 && (
          <span className="cd-resumen-pagos">
            {pagados} de {periodos.length} pagados
            {vencidos > 0 && <em> · {vencidos} vencido{vencidos === 1 ? '' : 's'}</em>}
          </span>
        )}
      >
        {periodos.length === 0 ? (
          <p className="cd-vacio">Todavía no hay períodos de alquiler generados.</p>
        ) : (
          <div className="cd-tabla-contenedor cd-tabla-scroll" ref={tablaPagos}>
            <table className="cd-tabla">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Vencimiento</th>
                  <th className="cd-num">Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((periodo, indice) => {
                  const vencido = periodo.estado === 'pendiente' && periodo.fecha_vencimiento < hoy;
                  const esProximo = indice === indiceProximo;
                  return (
                    <tr
                      key={periodo.id}
                      data-proximo={esProximo ? 'true' : undefined}
                      className={esProximo ? 'cd-fila-proxima' : undefined}
                    >
                      <td>{MESES[periodo.periodo_mes - 1]} {periodo.periodo_anio}</td>
                      <td>{formatearFecha(periodo.fecha_vencimiento)}</td>
                      <td className="cd-num">{formatearMonto(periodo.monto)}</td>
                      <td>
                        <span className={`cd-estado cd-estado-${vencido ? 'vencido' : periodo.estado}`}>
                          {vencido ? 'Vencido' : ESTADO_PERIODO_ALQUILER_LABELS[periodo.estado] || periodo.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Cronograma de ajustes"
        icono={<Icon name="calendar" size={18} />}
        contador={cronograma.length > 0 ? cronograma.length : null}
      >
        {cronograma.length === 0 ? (
          <p className="cd-vacio">No hay aumentos dentro de la vigencia.</p>
        ) : (
          <ol className="cd-cronograma">
            {cronograma.map((fecha, indice) => {
              const aplicado = aumentos.find((aumento) => aumento.estado === 'confirmado' && aumento.fecha_aumento === fecha);
              return (
                <li key={fecha}>
                  <span>Aumento {indice + 1}</span>
                  <strong>{formatearFecha(fecha)}</strong>
                  {aplicado && <em className="cd-aplicado">Aplicado</em>}
                </li>
              );
            })}
          </ol>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Historial de aumentos"
        icono={<Icon name="receipt" size={18} />}
        contador={aumentos.length > 0 ? aumentos.length : null}
      >
        {aumentos.length === 0 ? (
          <p className="cd-vacio">Todavía no hay aumentos registrados.</p>
        ) : (
          <div className="cd-tabla-contenedor">
            <table className="cd-tabla">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Estado</th>
                  <th className="cd-num">Anterior</th>
                  <th className="cd-num">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {aumentos.map((aumento) => (
                  <tr key={aumento.id}>
                    <td>{formatearFecha(aumento.fecha_aumento)}</td>
                    <td>
                      <span className={`cd-estado cd-estado-${aumento.estado}`}>
                        {ESTADO_AUMENTO_LABELS[aumento.estado] || aumento.estado}
                      </span>
                    </td>
                    <td className="cd-num">{formatearMonto(aumento.monto_anterior)}</td>
                    <td className="cd-num">{formatearMonto(aumento.monto_nuevo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {contrato.cerrado_en && (
        <Tarjeta titulo="Cierre" icono={<Icon name="alert" size={18} />} className="cd-cierre">
          <dl className="cd-datos">
            <Dato etiqueta="Cerrado el">{new Date(contrato.cerrado_en).toLocaleString('es-AR')}</Dato>
            <Dato etiqueta="Motivo">{MOTIVO_CIERRE_LABELS[contrato.motivo_cierre] || contrato.motivo_cierre}</Dato>
          </dl>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Documentos"
        icono={<Icon name="file" size={18} />}
        contador={documentos.length}
        accion={puedeEditarDocumentos && (
          <div className="cd-menu" ref={menuAdjuntarRef}>
            <input
              ref={inputArchivo}
              type="file"
              hidden
              onChange={(e) => handleSubirDocumento(e, adjuntaContrato.current)}
              disabled={uploading}
            />
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => setMenuAdjuntar((abierto) => !abierto)}
            >
              <Icon name="clip" size={16} />
              {uploading ? 'Subiendo...' : 'Adjuntar'}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Button>
            {menuAdjuntar && (
              <div className="cd-menu-lista" role="menu">
                <button type="button" role="menuitem" disabled={tieneContrato} onClick={() => elegirAdjunto(true)}>
                  <strong>Contrato</strong>
                  <small>{tieneContrato ? 'Ya hay un contrato cargado' : 'El documento del contrato (uno solo)'}</small>
                </button>
                <button type="button" role="menuitem" onClick={() => elegirAdjunto(false)}>
                  <strong>Otro documento</strong>
                  <small>DNI, garantías, anexos…</small>
                </button>
              </div>
            )}
          </div>
        )}
      >
        {documentos.length === 0 ? (
          <p className="cd-vacio">No hay documentos adjuntos.</p>
        ) : (
          <ul className="cd-docs">
            {documentosOrdenados.map((doc) => {
              const ext = extension(doc.nombre_archivo);
              return (
                <li key={doc.id} className="cd-doc">
                  <span className={`cd-doc-ext${ext === 'PDF' ? ' es-pdf' : ''}`}>{ext}</span>
                  <span className="cd-doc-info">
                    <strong title={doc.nombre_archivo}>{doc.nombre_archivo}</strong>
                    <small>Subido el {new Date(doc.subido_en).toLocaleDateString('es-AR')}</small>
                  </span>
                  {doc.es_contrato_firmado && <span className="cd-etiqueta-contrato">Contrato</span>}
                  <button
                    type="button"
                    className="cd-icono-btn"
                    onClick={() => handleDescargar(doc)}
                    title="Descargar"
                    aria-label={`Descargar ${doc.nombre_archivo}`}
                  >
                    <Icon name="download" size={16} />
                  </button>
                  {puedeEditarDocumentos && (
                    <button
                      type="button"
                      className="cd-icono-btn cd-peligro"
                      onClick={() => setDocumentoAEliminar(doc)}
                      title="Eliminar"
                      aria-label={`Eliminar ${doc.nombre_archivo}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      {avisoEliminar && (
        <div className="cd-info" role="note">
          <span className="cd-info-icono"><Icon name="alert" size={16} /></span>
          <div className="cd-info-texto">{avisoEliminar}</div>
        </div>
      )}

      <div className="detalle-acciones cd-acciones">
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
        {contrato.estado === 'activo' && (
          <Button onClick={() => abrirModalAccion('cierre')}>
            Finalizar o Rescindir
          </Button>
        )}
        {contrato.estado === 'programado' && (
          <Button variant="warning" onClick={() => abrirModalAccion('cancelar')}>
            Cancelar contrato
          </Button>
        )}
        {eliminacion.puede && (
          <Button variant="danger" onClick={() => setEliminarAbierto(true)} disabled={eliminando}>
            Eliminar contrato
          </Button>
        )}
      </div>

      {modalAccion === 'cierre' && (
        <CierreContrato
          inquilino={nombreInquilino(inquilino)}
          propiedad={direccionPropiedad(propiedad)}
          fechaFin={formatearFecha(contrato.fecha_fin)}
          antesDeTiempo={contrato.fecha_fin > hoy}
          onConfirmar={handleAccion}
          onCancelar={() => setModalAccion(null)}
        />
      )}

      {modalAccion === 'cancelar' && (
        <ModalAccionContrato
          accion={modalAccion}
          resumen={`${nombreInquilino(inquilino)} · ${direccionPropiedad(propiedad)}`}
          onConfirmar={handleAccion}
          onCancelar={() => setModalAccion(null)}
        />
      )}

      <ConfirmDialog
        isOpen={eliminarAbierto}
        title="Eliminar contrato"
        message={`Vas a eliminar definitivamente el contrato de ${nombreInquilino(inquilino)} · ${direccionPropiedad(propiedad)}.`}
        note="Este contrato no tiene aumentos aplicados, pagos realizados ni reclamos asociados, por eso se puede eliminar sin afectar el historial."
        warning="Se borran también sus documentos adjuntos, sus períodos pendientes y los aumentos sin aplicar. Esta acción no se puede deshacer."
        confirmLabel="Eliminar contrato"
        cancelLabel="Volver"
        busy={eliminando}
        onConfirm={handleEliminarContrato}
        onCancel={() => setEliminarAbierto(false)}
      />

      <ConfirmDialog
        isOpen={!!documentoAEliminar}
        title="Eliminar documento"
        message={`Vas a eliminar el documento "${documentoAEliminar?.nombre_archivo || ''}".`}
        warning="Se borra el archivo del sistema. Esta acción no se puede deshacer."
        confirmLabel="Eliminar documento"
        cancelLabel="Volver"
        onConfirm={handleEliminarDocumento}
        onCancel={() => setDocumentoAEliminar(null)}
      />
    </div>
  );
}

function extension(nombre) {
  const partes = String(nombre || '').split('.');
  return partes.length > 1 ? partes.pop().slice(0, 4).toUpperCase() : 'ARCH';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function formatearMonto(monto) {
  if (monto == null) return '—';
  return `$ ${parseFloat(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ACCIONES_CONTRATO = {
  cancelar: {
    titulo: 'Cancelar contrato',
    boton: 'Cancelar contrato',
    variante: 'warning',
    tono: 'warning',
    descripcion: 'Vas a cancelar un contrato que todavía no empezó.',
    efectos: [
      'El contrato pasa a estado Cancelado.',
      'La propiedad deja de estar reservada y queda disponible.',
      'Una vez confirmado, no se puede reabrir.',
    ],
  },
};

function ModalAccionContrato({ accion, resumen, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState(MOTIVO_CIERRE.ACUERDO_PARTES);
  const [observaciones, setObservaciones] = useState('');
  const [processing, setProcessing] = useState(false);
  const config = ACCIONES_CONTRATO[accion];

  async function handleSubmit(e) {
    e.preventDefault();
    setProcessing(true);
    try {
      await onConfirmar(accion, motivo, observaciones || null);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal isOpen onClose={onCancelar} title={config.titulo}>
      <form onSubmit={handleSubmit}>
        <div className={`cd-aviso cd-aviso-${config.tono}`}>
          <p>{config.descripcion}</p>
          {resumen && <p className="cd-aviso-contrato">{resumen}</p>}
          <ul>
            {config.efectos.map((efecto) => (
              <li key={efecto}>{efecto}</li>
            ))}
          </ul>
        </div>

        <div className="form-group">
          <label htmlFor="motivo">Motivo del cierre *</label>
          <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
            {Object.values(MOTIVO_CIERRE).map((m) => (
              <option key={m} value={m}>
                {MOTIVO_CIERRE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="observaciones">Observaciones</label>
          <textarea
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows="3"
            placeholder="Opcional"
          />
        </div>

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={processing}>
            Volver
          </Button>
          <Button type="submit" variant={config.variante} disabled={processing}>
            {processing ? 'Procesando...' : config.boton}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
