import { supabase } from '../lib/supabase';
import { sincronizarContratos } from './activacionContratos';

const SELECT_CONTRATO = `
  *,
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
    propietarios (
      id,
      tipo_persona,
      documento,
      nombre,
      apellido,
      razon_social
    )
  )
`;

export const contratosService = {
  async listar({ inquilinoId = null, propiedadId = null, estado = null } = {}) {
    await sincronizarContratos();
    let query = supabase
      .from('contratos')
      .select(SELECT_CONTRATO)
      .order('creado_en', { ascending: false });

    if (inquilinoId) query = query.eq('inquilino_id', inquilinoId);
    if (propiedadId) query = query.eq('propiedad_id', propiedadId);
    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  async obtenerPorId(id) {
    await sincronizarContratos();
    const { data, error } = await supabase
      .from('contratos')
      .select(SELECT_CONTRATO)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async crear(contrato) {
    const { data, error } = await supabase
      .from('contratos')
      .insert([contrato])
      .select(SELECT_CONTRATO)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async actualizar(id, cambios) {
    const { data, error } = await supabase
      .from('contratos')
      .update(cambios)
      .eq('id', id)
      .select(SELECT_CONTRATO)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async cancelar(id, motivo) {
    return this.actualizar(id, {
      estado: 'cancelado',
      motivo_cierre: motivo,
    });
  },

  async rescindir(id, motivo) {
    return this.actualizar(id, {
      estado: 'rescindido',
      motivo_cierre: motivo,
    });
  },

  async listarAumentos(contratoId) {
    const { data, error } = await supabase
      .from('aumentos')
      .select('id, aumento_anio, aumento_mes, fecha_aumento, monto_anterior, monto_nuevo, estado')
      .eq('contrato_id', contratoId)
      .order('fecha_aumento', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listarPeriodos(contratoId) {
    const { data, error } = await supabase
      .from('periodos_alquiler')
      .select('id, periodo_anio, periodo_mes, fecha_vencimiento, monto, estado, confirmado_en')
      .eq('contrato_id', contratoId)
      .order('fecha_vencimiento', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async evaluarEliminacion(contrato) {
    const motivos = [];
    if (contrato.estado === 'programado') {
      motivos.push('Para eliminarlo, primero cancelalo.');
    } else if (!['activo', 'cancelado', 'finalizado'].includes(contrato.estado)) {
      motivos.push('Solo se elimina un contrato activo, cancelado o finalizado.');
    }

    // Solo bloquean los movimientos reales: los períodos y aumentos pendientes se borran junto con el contrato.
    const [aumentos, periodos, comprobantes, reclamos] = await Promise.all([
      supabase.from('aumentos').select('id', { count: 'exact', head: true }).eq('contrato_id', contrato.id).eq('estado', 'confirmado'),
      supabase.from('periodos_alquiler').select('id', { count: 'exact', head: true }).eq('contrato_id', contrato.id).eq('estado', 'pagado'),
      supabase.from('comprobantes_pago').select('id, periodos_alquiler!inner(contrato_id)', { count: 'exact', head: true })
        .eq('periodos_alquiler.contrato_id', contrato.id),
      supabase.from('reclamos').select('id, contratos!inner(inquilino_id, propiedad_id)', { count: 'exact', head: true })
        .eq('contratos.inquilino_id', contrato.inquilino_id)
        .eq('contratos.propiedad_id', contrato.propiedad_id),
    ]);

    if (aumentos.error) throw new Error(aumentos.error.message);
    if (periodos.error) throw new Error(periodos.error.message);
    if (comprobantes.error) throw new Error(comprobantes.error.message);
    if (reclamos.error) throw new Error(reclamos.error.message);
    const asociados = [];
    if (aumentos.count > 0) asociados.push('aumentos aplicados');
    if (periodos.count > 0) asociados.push('pagos realizados');
    if (comprobantes.count > 0) asociados.push('comprobantes de pago');
    if (reclamos.count > 0) asociados.push('reclamos del inquilino sobre esta propiedad');
    if (asociados.length > 0) motivos.push(`Tiene asociados: ${asociados.join(', ')}.`);

    return { puede: motivos.length === 0, motivos, asociados };
  },

  async eliminar(id) {
    const documentos = await this.listarDocumentos(id);
    const { error } = await supabase.rpc('eliminar_contrato', { p_contrato_id: id });
    if (error) throw new Error(error.message);

    const rutas = documentos.map((documento) => documento.ruta_storage).filter(Boolean);
    if (rutas.length > 0) {
      await supabase.storage.from('documentos-contratos').remove(rutas);
    }
  },

  // Documentos
  async listarDocumentos(contratoId) {
    const { data, error } = await supabase
      .from('documentos_contrato')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('subido_en', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async subirDocumento(contratoId, archivo, esContratoFirmado = false) {
    const timestamp = Date.now();
    const nombreArchivo = `${timestamp}-${archivo.name}`;
    const rutaStorage = `${contratoId}/${nombreArchivo}`;

    // 1. Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from('documentos-contratos')
      .upload(rutaStorage, archivo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    // 2. Insertar metadata
    const { data, error: insertError } = await supabase
      .from('documentos_contrato')
      .insert([
        {
          contrato_id: contratoId,
          nombre_archivo: archivo.name,
          ruta_storage: rutaStorage,
          tipo_mime: archivo.type || null,
          es_contrato_firmado: esContratoFirmado,
        },
      ])
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    return data;
  },

  async eliminarDocumento(documentoId, rutaStorage) {
    // 1. Borrar de Storage
    const { error: storageError } = await supabase.storage
      .from('documentos-contratos')
      .remove([rutaStorage]);

    if (storageError) throw new Error(storageError.message);

    // 2. Borrar metadata
    const { error: deleteError } = await supabase
      .from('documentos_contrato')
      .delete()
      .eq('id', documentoId);

    if (deleteError) throw new Error(deleteError.message);
  },

  async descargarDocumento(rutaStorage) {
    const { data, error } = await supabase.storage
      .from('documentos-contratos')
      .download(rutaStorage);

    if (error) throw new Error(error.message);
    return data;
  },

  obtenerUrlPublica(rutaStorage) {
    const { data } = supabase.storage
      .from('documentos-contratos')
      .getPublicUrl(rutaStorage);

    return data.publicUrl;
  },
};

export function nombreInquilino(inquilino) {
  if (!inquilino) return 'Sin inquilino';
  if (inquilino.tipo_persona === 'juridica') return inquilino.razon_social || 'Sin razón social';
  return `${inquilino.nombre || ''} ${inquilino.apellido || ''}`.trim() || 'Sin nombre';
}

export function direccionPropiedad(propiedad) {
  if (!propiedad) return 'Sin propiedad';
  const unidad = [propiedad.piso && `Piso ${propiedad.piso}`, propiedad.departamento && `Depto ${propiedad.departamento}`]
    .filter(Boolean)
    .join(', ');
  const linea1 = `${propiedad.calle} ${propiedad.numero}${unidad ? ` (${unidad})` : ''}`;
  return `${linea1}, ${propiedad.localidad}`;
}

const MESES_AJUSTE = {
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
};

function isoDe(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function sumarMeses(fechaISO, meses) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const destino = new Date(anio, mes - 1 + meses, dia);
  const mesEsperado = (mes - 1 + meses) % 12;
  if (destino.getMonth() !== mesEsperado) {
    return isoDe(new Date(destino.getFullYear(), destino.getMonth(), 0));
  }
  return isoDe(destino);
}

export function calendarioAumentos({ fechaInicio, fechaFin, periodicidad }) {
  const meses = MESES_AJUSTE[periodicidad];
  if (!fechaInicio || !fechaFin || !meses || fechaFin <= fechaInicio) return [];

  const fechas = [];
  let actual = sumarMeses(fechaInicio, meses);
  while (actual <= fechaFin && fechas.length < 80) {
    fechas.push(actual);
    actual = sumarMeses(actual, meses);
  }
  return fechas;
}

export function calcularProximoAumento(contrato) {
  if (!contrato || !['programado', 'activo'].includes(contrato.estado)) return null;
  if (contrato.fecha_proximo_aumento) return contrato.fecha_proximo_aumento;
  if (!contrato.fecha_inicio) return null;

  const [anio, mes, dia] = contrato.fecha_inicio.split('-').map(Number);
  const sumar = MESES_AJUSTE[contrato.periodicidad_ajuste] || 12;
  const proximo = new Date(anio, mes - 1 + sumar, dia);
  const y = proximo.getFullYear();
  const m = String(proximo.getMonth() + 1).padStart(2, '0');
  const d = String(proximo.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
