import { supabase } from '../lib/supabase';
import { activarContratosProgramados } from './activacionContratos';
import { calcularProximoAumento, direccionPropiedad, nombreInquilino } from './contratosService';
import { nombrePropietario } from './propiedadesService';
import { aumentosService } from './aumentosService';

const SELECT_PERIODO = `
  *,
  contratos (
    id,
    estado,
    fecha_inicio,
    fecha_fin,
    fecha_proximo_aumento,
    periodicidad_ajuste,
    monto_actual,
    inquilino_id,
    propiedad_id,
    inquilinos (
      id,
      tipo_persona,
      documento,
      nombre,
      apellido,
      razon_social
    ),
    propiedades (
      id,
      codigo,
      tipo,
      calle,
      numero,
      piso,
      departamento,
      localidad,
      provincia,
      propietario_id,
      propietarios (
        id,
        tipo_persona,
        documento,
        nombre,
        apellido,
        razon_social
      )
    )
  )
`;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function faltaAplicarAumento(periodo) {
  const contrato = periodo?.contratos;
  if (!periodo || periodo.estado !== 'pendiente' || !contrato) return false;
  if (contrato.estado !== 'activo') return false;

  const fecha = calcularProximoAumento(contrato);
  if (!fecha) return false;

  const [anio, mes] = fecha.split('-').map(Number);
  return periodo.periodo_anio > anio
    || (periodo.periodo_anio === anio && periodo.periodo_mes >= mes);
}

export function fechaHoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function diasHasta(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(anio, mes - 1, dia) - hoy) / (24 * 60 * 60 * 1000));
}

export function etiquetaVencimiento(periodo) {
  if (periodo.estado === 'pagado') return null;
  const dias = diasHasta(periodo.fecha_vencimiento);
  if (dias < 0) return { texto: `Hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`, tono: 'vencido' };
  if (dias === 0) return { texto: 'Vence hoy', tono: 'pronto' };
  if (dias === 1) return { texto: 'Vence mañana', tono: 'pronto' };
  return { texto: `En ${dias} días`, tono: dias <= 7 ? 'pronto' : 'normal' };
}

export const alquileresService = {
  async listar({
    mes = null,
    estado = null,
    contratoId = null,
    inquilinoId = null,
    propiedadId = null,
    propietarioId = null,
  } = {}) {
    await activarContratosProgramados();
    let query = supabase
      .from('periodos_alquiler')
      .select(SELECT_PERIODO)
      .order('fecha_vencimiento', { ascending: true });

    if (mes) {
      const [anio, numeroMes] = mes.split('-').map(Number);
      if (anio && numeroMes) {
        query = query.eq('periodo_anio', anio).eq('periodo_mes', numeroMes);
      }
    }
    if (estado === 'vencido') {
      query = query.eq('estado', 'pendiente').lt('fecha_vencimiento', fechaHoyISO());
    } else if (estado) {
      query = query.eq('estado', estado);
    }
    if (contratoId) query = query.eq('contrato_id', contratoId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return data.filter((periodo) => {
      const contrato = periodo.contratos;
      const propiedad = contrato?.propiedades;
      if (inquilinoId && contrato?.inquilinos?.id !== inquilinoId) return false;
      if (propiedadId && propiedad?.id !== propiedadId) return false;
      if (propietarioId && propiedad?.propietarios?.id !== propietarioId) return false;
      return true;
    });
  },

  // El "mes en curso" es el período de trabajo: el alquiler de un mes se sigue
  // viendo hasta el día 10 inclusive del mes siguiente, aunque ya esté todo cobrado.
  async obtenerResumenCobranza() {
    await activarContratosProgramados();
    const hoy = fechaHoyISO();
    const { anio, mes } = aumentosService.obtenerPeriodoTrabajo();

    const [vencidos, delMes] = await Promise.all([
      supabase
        .from('periodos_alquiler')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .lt('fecha_vencimiento', hoy),
      supabase
        .from('periodos_alquiler')
        .select('fecha_vencimiento', { count: 'exact' })
        .eq('estado', 'pendiente')
        .eq('periodo_anio', anio)
        .eq('periodo_mes', mes)
        .order('fecha_vencimiento', { ascending: false })
        .limit(1),
    ]);
    if (vencidos.error) throw new Error(vencidos.error.message);
    if (delMes.error) throw new Error(delMes.error.message);

    return {
      mesEnCurso: `${anio}-${String(mes).padStart(2, '0')}`,
      // El último vencimiento entre los pendientes del mes.
      vencimiento: delMes.data?.[0]?.fecha_vencimiento || null,
      pendientesMes: delMes.count || 0,
      vencidos: vencidos.count || 0,
    };
  },
  async obtenerPorId(id) {
    const { data, error } = await supabase
      .from('periodos_alquiler')
      .select(SELECT_PERIODO)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async listarComprobantes(periodoId) {
    const { data, error } = await supabase
      .from('comprobantes_pago')
      .select('*')
      .eq('periodo_alquiler_id', periodoId)
      .order('subido_en', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async subirComprobante(periodoId, archivo, { montoInformado, fechaPagoInformada, observaciones } = {}) {
    const nombreSeguro = archivo.name.replace(/[^\w.\-]+/g, '_');
    const rutaStorage = `${periodoId}/${Date.now()}-${nombreSeguro}`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes-pago')
      .upload(rutaStorage, archivo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: userData } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from('comprobantes_pago')
      .insert([{
        periodo_alquiler_id: periodoId,
        nombre_archivo: archivo.name,
        ruta_storage: rutaStorage,
        tipo_mime: archivo.type || null,
        monto_informado: montoInformado ? Number(montoInformado) : null,
        fecha_pago_informada: fechaPagoInformada || null,
        observaciones: observaciones || null,
        subido_por: userData?.user?.id || null,
      }])
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from('comprobantes-pago').remove([rutaStorage]);
      throw new Error(insertError.message);
    }

    return data;
  },

  async eliminarComprobante(comprobanteId, rutaStorage) {
    const { error: storageError } = await supabase.storage
      .from('comprobantes-pago')
      .remove([rutaStorage]);

    if (storageError) throw new Error(storageError.message);

    const { error } = await supabase
      .from('comprobantes_pago')
      .delete()
      .eq('id', comprobanteId);

    if (error) throw new Error(error.message);
  },

  async descargarComprobante(rutaStorage) {
    const { data, error } = await supabase.storage
      .from('comprobantes-pago')
      .download(rutaStorage);

    if (error) throw new Error(error.message);
    return data;
  },

  async confirmarPago(periodoId) {
    const { error } = await supabase.rpc('confirmar_pago_periodo', {
      p_periodo_id: periodoId,
    });

    if (error) throw new Error(error.message);
  },

  async deshacerPago(periodoId) {
    const { error } = await supabase.rpc('deshacer_pago_periodo', {
      p_periodo_id: periodoId,
    });

    if (error) throw new Error(error.message);
  },
};

export function mesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export function etiquetaMes(clave) {
  if (!clave) return 'todos los meses';
  const [anio, mes] = clave.split('-').map(Number);
  return `${MESES[(mes || 1) - 1]} ${anio}`;
}

export function etiquetaPeriodo(periodo) {
  const mes = MESES[(periodo?.periodo_mes || 1) - 1] || periodo?.periodo_mes;
  return `${mes} ${periodo?.periodo_anio || ''}`.trim();
}

export function formatearFecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}

export function formatearMonto(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '—';
  return numero.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

export function resumenContrato(contrato) {
  if (!contrato) return 'Sin contrato';
  const inquilino = nombreInquilino(contrato.inquilinos);
  const direccion = direccionPropiedad(contrato.propiedades);
  return `${inquilino} · ${direccion}`;
}

export function nombreDueno(periodo) {
  return nombrePropietario(periodo?.contratos?.propiedades?.propietarios);
}
