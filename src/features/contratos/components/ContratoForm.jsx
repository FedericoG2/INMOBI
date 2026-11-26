import { useState, useEffect, useRef } from 'react';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/components/Toast';
import { TIPO_AJUSTE, PERIODICIDAD_AJUSTE, TIPO_AJUSTE_LABELS, PERIODICIDAD_AJUSTE_LABELS, TIPO_PROPIEDAD_LABELS } from '../../../constants/estados';
import { SelectBuscable } from '../../../shared/components/SelectBuscable';
import { InputMonto } from '../../../shared/components/InputMonto';
import { SubirArchivos } from '../../../shared/components/SubirArchivos';
import { Icon } from '../../../shared/components/Icons';
import { inquilinosService } from '../../../services/inquilinosService';
import { propiedadesService } from '../../../services/propiedadesService';
import { nombreInquilino, direccionPropiedad, calendarioAumentos } from '../../../services/contratosService';
import '../../../shared/styles/forms.css';
import './ContratoForm.css';

const PASOS = [
  { numero: 1, titulo: 'Partes y vigencia' },
  { numero: 2, titulo: 'Valor y ajuste' },
  { numero: 3, titulo: 'Documentación' },
  { numero: 4, titulo: 'Resumen' },
];

const CAMPOS_PASO = {
  1: ['inquilino_id', 'propiedad_id', 'fecha_inicio', 'fecha_fin'],
  2: ['monto_inicial', 'dia_vencimiento'],
};

const DESCRIPCION_TIPO_AJUSTE = {
  [TIPO_AJUSTE.IPC]: 'Índice de Precios al Consumidor',
  [TIPO_AJUSTE.ICL]: 'Índice para Contratos de Locación',
};

const DESCRIPCION_PERIODICIDAD = {
  [PERIODICIDAD_AJUSTE.TRIMESTRAL]: 'Cada 3 meses',
  [PERIODICIDAD_AJUSTE.CUATRIMESTRAL]: 'Cada 4 meses',
  [PERIODICIDAD_AJUSTE.SEMESTRAL]: 'Cada 6 meses',
  [PERIODICIDAD_AJUSTE.ANUAL]: 'Cada 12 meses',
};

const OPCIONES_TIPO_AJUSTE = Object.values(TIPO_AJUSTE).map((tipo) => ({
  value: tipo,
  label: TIPO_AJUSTE_LABELS[tipo],
  sublabel: DESCRIPCION_TIPO_AJUSTE[tipo],
}));

const OPCIONES_PERIODICIDAD = Object.values(PERIODICIDAD_AJUSTE).map((periodicidad) => ({
  value: periodicidad,
  label: PERIODICIDAD_AJUSTE_LABELS[periodicidad],
  sublabel: DESCRIPCION_PERIODICIDAD[periodicidad],
}));


const DURACIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function isoDe(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// El contrato termina el día anterior al aniversario (01/11/2026 + 3 años -> 31/10/2029).
function calcularFin(fechaInicio, anios) {
  const [anio, mes, dia] = fechaInicio.split('-').map(Number);
  return isoDe(new Date(anio + anios, mes - 1, dia - 1));
}

function duracionExacta(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return '';
  const anios = DURACIONES.find((n) => calcularFin(fechaInicio, n) === fechaFin);
  return anios ? String(anios) : '';
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function CalendarioEstimado({ fechaInicio, fechaFin, periodicidad }) {
  const fechas = calendarioAumentos({ fechaInicio, fechaFin, periodicidad });
  return (
    <div className="calendario-aumentos">
      <h3>Calendario estimado de aumentos</h3>
      {fechas.length === 0 ? (
        <p>Completá inicio, duración y periodicidad para ver las fechas.</p>
      ) : (
        <ol>
          {fechas.map((fecha, indice) => (
            <li key={fecha}>
              <span>Aumento {indice + 1}</span>
              <strong>{formatearFecha(fecha)}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatearMonto(valor) {
  const numero = Number(valor);
  if (!numero) return '';
  return numero.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ResumenSeccion({ titulo, icono, onEditar, filas }) {
  return (
    <div className="form-section">
      <div className="resumen-encabezado">
        <div className="resumen-titulo">
          {icono && <span className="resumen-icono">{icono}</span>}
          <p className="form-section-title">{titulo}</p>
        </div>
        <button type="button" className="resumen-editar" onClick={onEditar}>Editar</button>
      </div>
      <dl className="resumen-lista">
        {filas.map(([etiqueta, valor, anchoCompleto, destacado]) => (
          <div
            key={etiqueta}
            className={[anchoCompleto && 'ancho-completo', destacado && 'destacado'].filter(Boolean).join(' ') || undefined}
          >
            <dt>{etiqueta}</dt>
            <dd>{valor || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ContratoForm({ contrato, onSubmit, onCancel, modo = 'crear' }) {
  const [inquilinos, setInquilinos] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(true);

  const [formData, setFormData] = useState({
    inquilino_id: contrato?.inquilino_id || '',
    propiedad_id: contrato?.propiedad_id || '',
    fecha_inicio: contrato?.fecha_inicio || '',
    fecha_fin: contrato?.fecha_fin || '',
    monto_inicial: contrato?.monto_inicial || '',
    monto_actual: contrato?.monto_actual || '',
    dia_vencimiento: contrato?.dia_vencimiento_pago || 10,
    tipo_ajuste: contrato?.tipo_ajuste || TIPO_AJUSTE.IPC,
    periodicidad_ajuste: contrato?.periodicidad_ajuste || PERIODICIDAD_AJUSTE.TRIMESTRAL,
    observaciones: contrato?.observaciones || '',
  });

  const [errores, setErrores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [paso, setPaso] = useState(1);
  const esEdicion = modo === 'editar';
  const esWizard = !esEdicion;
  const ver = (numero) => !esWizard || paso === numero;
  const [duracion, setDuracion] = useState(
    () => duracionExacta(contrato?.fecha_inicio, contrato?.fecha_fin) || (contrato ? '' : '3'),
  );
  const formRef = useRef(null);

  useEffect(() => {
    formRef.current?.closest('.modal-body')?.scrollTo({ top: 0 });
  }, [paso]);

  const [fechaManual] = useState(
    () => esEdicion && !duracionExacta(contrato?.fecha_inicio, contrato?.fecha_fin),
  );
  const [documentos, setDocumentos] = useState([]);
  const [contratoFirmado, setContratoFirmado] = useState(null);
  const toast = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoadingDatos(true);
    try {
      const [inquilinosData, propiedadesData] = await Promise.all([
        inquilinosService.listar(),
        propiedadesService.listar({ estado: 'disponible' }),
      ]);
      setInquilinos(inquilinosData);
      setPropiedades(propiedadesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoadingDatos(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: null }));
    }
  }

  // La restricción es solo de la pantalla: la base admite fechas pasadas para armar escenarios de demo.
  function errorInicioPasado(fecha) {
    const sinCambios = esEdicion && fecha === contrato?.fecha_inicio;
    if (!fecha || sinCambios || fecha >= isoDe(new Date())) return null;
    return 'La fecha de inicio no puede ser anterior a hoy';
  }

  function cambiarInicio(e) {
    const fecha = e.target.value;
    setFormData((prev) => ({
      ...prev,
      fecha_inicio: fecha,
      fecha_fin: duracion && fecha ? calcularFin(fecha, Number(duracion)) : prev.fecha_fin,
    }));
    // Se avisa en el momento, salvo mientras se está escribiendo el año.
    const aviso = fecha >= '2000-01-01' ? errorInicioPasado(fecha) : null;
    setErrores((prev) => ({ ...prev, fecha_inicio: aviso, fecha_fin: null }));
  }

  // Solo admite números enteros del 1 al 28.
  function cambiarDiaPago(e) {
    const dia = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (dia !== '' && (Number(dia) < 1 || Number(dia) > 28)) return;
    handleChange({ target: { name: 'dia_vencimiento', value: dia } });
  }

  function cambiarDuracion(e) {
    const valor = e.target.value;
    setDuracion(valor);
    setFormData((prev) => ({
      ...prev,
      fecha_fin: valor && prev.fecha_inicio ? calcularFin(prev.fecha_inicio, Number(valor)) : '',
    }));
    setErrores((prev) => ({ ...prev, fecha_fin: null }));
  }

  function erroresDePaso(numero) {
    const nuevos = {};

    if (numero === 1) {
      if (!formData.inquilino_id) nuevos.inquilino_id = 'Seleccione un inquilino';
      if (!formData.propiedad_id) nuevos.propiedad_id = 'Seleccione una propiedad';
      if (!formData.fecha_inicio) nuevos.fecha_inicio = 'Ingrese fecha de inicio';
      else if (errorInicioPasado(formData.fecha_inicio)) nuevos.fecha_inicio = errorInicioPasado(formData.fecha_inicio);
      if (!formData.fecha_fin) {
        if (fechaManual) nuevos.fecha_fin = 'Ingrese fecha de fin';
        else if (!duracion) nuevos.fecha_fin = 'Seleccione la duración';
      }
      if (formData.fecha_inicio && formData.fecha_fin
        && new Date(formData.fecha_inicio) >= new Date(formData.fecha_fin)) {
        nuevos.fecha_fin = 'La fecha de fin debe ser posterior a la de inicio';
      }
    }

    if (numero === 2) {
      if (!formData.monto_inicial || parseFloat(formData.monto_inicial) <= 0) {
        nuevos.monto_inicial = 'Ingrese un monto válido';
      }
      const dia = parseInt(formData.dia_vencimiento, 10);
      if (!dia || dia < 1 || dia > 28) nuevos.dia_vencimiento = 'Ingrese un día entre 1 y 28';
    }

    return nuevos;
  }

  function siguiente() {
    const nuevos = erroresDePaso(paso);
    setErrores((prev) => ({ ...prev, ...nuevos }));
    if (Object.keys(nuevos).length === 0) setPaso((actual) => actual + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (esWizard && paso < PASOS.length) {
      siguiente();
      return;
    }

    const pasoConErrores = [1, 2].find((numero) => Object.keys(erroresDePaso(numero)).length > 0);
    if (pasoConErrores) {
      setErrores({ ...erroresDePaso(1), ...erroresDePaso(2) });
      if (esWizard) setPaso(pasoConErrores);
      return;
    }

    setSubmitting(true);
    try {
      const datos = {
        inquilino_id: formData.inquilino_id,
        propiedad_id: formData.propiedad_id,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        monto_inicial: parseFloat(formData.monto_inicial),
        monto_actual: parseFloat(formData.monto_actual || formData.monto_inicial),
        dia_vencimiento_pago: parseInt(formData.dia_vencimiento, 10),
        tipo_ajuste: formData.tipo_ajuste,
        periodicidad_ajuste: formData.periodicidad_ajuste,
        observaciones: formData.observaciones || null,
        documentos,
        contratoFirmado,
      };

      await onSubmit(datos);
    } catch (error) {
      toast.error(`No se pudo crear el contrato: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDatos) {
    return <div className="contrato-form-loading">Cargando datos...</div>;
  }

  const propiedadesDisponibles = esEdicion
    ? [...propiedades, contrato?.propiedades].filter(Boolean)
    : propiedades;

  const opcionesInquilinos = inquilinos.map((inq) => ({
    value: inq.id,
    label: nombreInquilino(inq),
    meta: `${inq.tipo_persona === 'juridica' ? 'CUIT' : 'DNI'} ${inq.documento}`,
  }));
  const opcionesPropiedades = propiedadesDisponibles.map((prop) => ({
    value: prop.id,
    label: direccionPropiedad(prop),
    sublabel: TIPO_PROPIEDAD_LABELS[prop.tipo] || '',
    meta: prop.codigo || '',
    icono: <Icon name="building" size={16} />,
  }));

  const opcionInquilino = opcionesInquilinos.find((opcion) => opcion.value === formData.inquilino_id);
  const opcionPropiedad = opcionesPropiedades.find((opcion) => opcion.value === formData.propiedad_id);

  const fechasAumento = calendarioAumentos({
    fechaInicio: formData.fecha_inicio,
    fechaFin: formData.fecha_fin,
    periodicidad: formData.periodicidad_ajuste,
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {esWizard && (
        <ol className="wizard-steps">
          {PASOS.map(({ numero, titulo }) => (
            <li
              key={numero}
              className={`wizard-step${paso === numero ? ' is-active' : ''}${paso > numero ? ' is-done' : ''}`}
            >
              <button type="button" disabled={paso <= numero} onClick={() => setPaso(numero)}>
                <span className="wizard-step-num">{paso > numero ? '✓' : numero}</span>
                <span className="wizard-step-title">{titulo}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className={`wizard-body${ver(2) ? ' has-aside' : ''}`}>
      <div className="wizard-main">
      {esWizard && (CAMPOS_PASO[paso] || []).some((campo) => errores[campo]) && (
        <div className="form-error-global">Completá todos los campos obligatorios (*) para continuar.</div>
      )}
      {ver(1) && (<>
      <div className="form-section">
        <p className="form-section-title">Partes del contrato</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="inquilino_id">Inquilino *</label>
            <SelectBuscable
              id="inquilino_id"
              value={formData.inquilino_id}
              onChange={(valor) => handleChange({ target: { name: 'inquilino_id', value: valor } })}
              opciones={opcionesInquilinos}
              placeholder="Seleccionar inquilino"
              placeholderBusqueda="Buscar por nombre o documento..."
              textoVacio="No se encontraron inquilinos"
              disabled={esEdicion}
              error={!!errores.inquilino_id}
            />
            {errores.inquilino_id && <span className="field-error">{errores.inquilino_id}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="propiedad_id">Propiedad *</label>
            <SelectBuscable
              id="propiedad_id"
              value={formData.propiedad_id}
              onChange={(valor) => handleChange({ target: { name: 'propiedad_id', value: valor } })}
              opciones={opcionesPropiedades}
              placeholder="Seleccionar propiedad"
              placeholderBusqueda="Buscar por dirección o código..."
              textoVacio="No hay propiedades disponibles"
              disabled={esEdicion}
              error={!!errores.propiedad_id}
            />
            {errores.propiedad_id && <span className="field-error">{errores.propiedad_id}</span>}
            {!errores.propiedad_id && (
              propiedadesDisponibles.length === 0 ? (
                <p className="form-aviso">
                  <Icon name="alert" size={16} />
                  <span>No hay propiedades disponibles para alquilar. Cargá una propiedad nueva o liberá una que esté ocupada.</span>
                </p>
              ) : (
                <p className="form-info">
                  <Icon name="alert" size={16} />
                  <span>Solo se listan propiedades <strong>disponibles</strong>, sin contrato vigente.</span>
                </p>
              )
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-title">Vigencia</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fecha_inicio">Fecha de inicio *</label>
            <input
              type="date"
              id="fecha_inicio"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={cambiarInicio}
              min={esEdicion ? undefined : isoDe(new Date())}
              className={errores.fecha_inicio ? 'input-error' : ''}
            />
            {errores.fecha_inicio && <span className="field-error">{errores.fecha_inicio}</span>}
          </div>

          {fechaManual ? (
            <div className="form-group">
              <label htmlFor="fecha_fin">Fecha de fin *</label>
              <input
                type="date"
                id="fecha_fin"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleChange}
                className={errores.fecha_fin ? 'input-error' : ''}
              />
              {errores.fecha_fin && <span className="field-error">{errores.fecha_fin}</span>}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="duracion">Duración *</label>
              <select
                id="duracion"
                value={duracion}
                onChange={cambiarDuracion}
                className={errores.fecha_fin ? 'input-error' : ''}
              >
                <option value="">-- Seleccione --</option>
                {DURACIONES.map((anios) => (
                  <option key={anios} value={anios}>{anios} {anios === 1 ? 'año' : 'años'}</option>
                ))}
              </select>
              {errores.fecha_fin ? (
                <span className="field-error">{errores.fecha_fin}</span>
              ) : (
                formData.fecha_fin && (
                  <p className="form-info">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <span>Finaliza el <strong>{formatearFecha(formData.fecha_fin)}</strong></span>
                  </p>
                )
              )}
            </div>
          )}
        </div>
      </div>
      </>)}

      {ver(2) && (
      <div className="form-section">
        <p className="form-section-title">Valor y ajuste</p>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="monto_inicial">Monto inicial *</label>
            <InputMonto
              id="monto_inicial"
              name="monto_inicial"
              value={String(formData.monto_inicial ?? '')}
              onChange={(valor) => handleChange({ target: { name: 'monto_inicial', value: valor } })}
              placeholder="$ 500.000"
              maxLength={18}
              disabled={esEdicion}
              className={errores.monto_inicial ? 'input-error' : ''}
            />
            {errores.monto_inicial && <span className="field-error">{errores.monto_inicial}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="dia_vencimiento">Día de pago del alquiler *</label>
            <input
              type="text"
              id="dia_vencimiento"
              name="dia_vencimiento"
              value={formData.dia_vencimiento}
              onChange={cambiarDiaPago}
              inputMode="numeric"
              autoComplete="off"
              className={errores.dia_vencimiento ? 'input-error' : ''}
            />
            {errores.dia_vencimiento ? (
              <span className="field-error">{errores.dia_vencimiento}</span>
            ) : (
              <p className="form-hint">Del 1 al 28.</p>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tipo_ajuste">Tipo de ajuste *</label>
            <SelectBuscable
              id="tipo_ajuste"
              value={formData.tipo_ajuste}
              onChange={(valor) => handleChange({ target: { name: 'tipo_ajuste', value: valor } })}
              opciones={OPCIONES_TIPO_AJUSTE}
              buscable={false}
            />
          </div>

          <div className="form-group">
            <label htmlFor="periodicidad_ajuste">Periodicidad de ajuste *</label>
            <SelectBuscable
              id="periodicidad_ajuste"
              value={formData.periodicidad_ajuste}
              onChange={(valor) => handleChange({ target: { name: 'periodicidad_ajuste', value: valor } })}
              opciones={OPCIONES_PERIODICIDAD}
              buscable={false}
            />
          </div>
        </div>
      </div>
      )}

      {ver(3) && (
        <div className="form-section">
          <p className="form-section-title">{esEdicion ? 'Observaciones' : 'Documentación y observaciones'}</p>

          {!esEdicion && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contrato_firmado">Contrato</label>
                <SubirArchivos
                  id="contrato_firmado"
                  value={contratoFirmado ? [contratoFirmado] : []}
                  onChange={(archivos) => setContratoFirmado(archivos[0] || null)}
                />
                <p className="form-hint">Un solo archivo con el documento del contrato.</p>
              </div>
              <div className="form-group">
                <label htmlFor="documentos">Anexos y otra documentación</label>
                <SubirArchivos
                  id="documentos"
                  multiple
                  max={3}
                  value={documentos}
                  onChange={setDocumentos}
                />
                <p className="form-hint">Opcional. También se pueden cargar después, desde el detalle.</p>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="2"
              className="textarea-compact"
            />
          </div>
        </div>
      )}

      {esWizard && paso === 4 && (<div className="resumen-grid">
        <ResumenSeccion
          titulo="Partes"
          icono={<Icon name="users" size={18} />}
          onEditar={() => setPaso(1)}
          filas={[
            [
              'Inquilino',
              opcionInquilino && (
                <span key="inquilino" className="resumen-opcion">
                  <span className="selectb-texto"><strong>{opcionInquilino.label}</strong></span>
                  <span className="selectb-meta">{opcionInquilino.meta}</span>
                </span>
              ),
              true,
            ],
            [
              'Propiedad',
              opcionPropiedad && (
                <span key="propiedad" className="resumen-opcion">
                  <span className="selectb-avatar">{opcionPropiedad.icono}</span>
                  <span className="selectb-texto">
                    <strong>{opcionPropiedad.label}</strong>
                    {opcionPropiedad.sublabel && <small>{opcionPropiedad.sublabel}</small>}
                  </span>
                  {opcionPropiedad.meta && <span className="selectb-meta">{opcionPropiedad.meta}</span>}
                </span>
              ),
              true,
            ],
          ]}
        />
        <ResumenSeccion
          titulo="Vigencia"
          icono={<IconoCalendario />}
          onEditar={() => setPaso(1)}
          filas={[
            ['Inicio', formatearFecha(formData.fecha_inicio)],
            ['Duración', duracion ? `${duracion} ${duracion === '1' ? 'año' : 'años'}` : ''],
            ['Finaliza', formatearFecha(formData.fecha_fin)],
          ]}
        />
        <ResumenSeccion
          titulo="Valor y ajuste"
          icono={<Icon name="trend" size={18} />}
          onEditar={() => setPaso(2)}
          filas={[
            ['Monto inicial', formatearMonto(formData.monto_inicial), false, true],
            ['Pago del alquiler', formData.dia_vencimiento ? `Hasta el día ${formData.dia_vencimiento} del mes siguiente` : ''],
            ['Tipo de ajuste', TIPO_AJUSTE_LABELS[formData.tipo_ajuste]],
            ['Periodicidad', PERIODICIDAD_AJUSTE_LABELS[formData.periodicidad_ajuste]],
            [
              'Aumentos estimados',
              fechasAumento.length
                ? `${fechasAumento.length} (el primero el ${formatearFecha(fechasAumento[0])})`
                : 'Ninguno dentro de la vigencia',
              true,
            ],
          ]}
        />
        <ResumenSeccion
          titulo="Documentación y notas"
          icono={<Icon name="file" size={18} />}
          onEditar={() => setPaso(3)}
          filas={[
            ['Contrato', contratoFirmado ? contratoFirmado.name : 'No cargado'],
            [
              'Anexos',
              documentos.length
                ? `${documentos.length} archivo${documentos.length === 1 ? '' : 's'}: ${documentos.map((archivo) => archivo.name).join(', ')}`
                : 'Sin anexos',
            ],
            ['Observaciones', formData.observaciones, true],
          ]}
        />
      </div>)}
      </div>

      {ver(2) && (
        <aside className="wizard-aside">
          <CalendarioEstimado
            fechaInicio={formData.fecha_inicio}
            fechaFin={formData.fecha_fin}
            periodicidad={formData.periodicidad_ajuste}
          />
        </aside>
      )}
      </div>

      <div className="form-actions form-actions-sticky">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        {esWizard && paso > 1 && (
          <Button type="button" variant="secondary" onClick={() => setPaso(paso - 1)}>
            Atrás
          </Button>
        )}
        {esWizard && paso < PASOS.length ? (
          <Button key="siguiente" type="button" onClick={siguiente}>
            Siguiente
          </Button>
        ) : (
          <Button key="guardar" type="submit" variant={esWizard ? 'success' : 'primary'} disabled={submitting}>
            {!submitting && esWizard && (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
            {submitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Contrato'}
          </Button>
        )}
      </div>
    </form>
  );
}
