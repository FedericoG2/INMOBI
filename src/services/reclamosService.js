import { supabase } from '../lib/supabase';
import { ESTADO_RECLAMO } from '../constants/estados';
import { contratosService, direccionPropiedad, nombreInquilino } from './contratosService';

const SELECT_RECLAMO = `
  *,
  contratos (
    id,
    estado,
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
      calle,
      numero,
      piso,
      departamento,
      localidad
    )
  )
`;

// Un solo paso posible desde cada estado, según el diagrama de transición de estados.
const SIGUIENTE_ESTADO = {
  [ESTADO_RECLAMO.PENDIENTE]: ESTADO_RECLAMO.EN_PROCESO,
  [ESTADO_RECLAMO.EN_PROCESO]: ESTADO_RECLAMO.REVISION,
  [ESTADO_RECLAMO.REVISION]: ESTADO_RECLAMO.RESUELTO,
  [ESTADO_RECLAMO.RESUELTO]: ESTADO_RECLAMO.EN_PROCESO,
};

export function estadosSiguientes(estado) {
  return SIGUIENTE_ESTADO[estado] ? [SIGUIENTE_ESTADO[estado]] : [];
}

export const reclamosService = {
  async listar({ estado = null, prioridad = null, categoria = null } = {}) {
    let query = supabase
      .from('reclamos')
      .select(SELECT_RECLAMO)
      .order('creado_en', { ascending: false });

    if (estado) query = query.eq('estado', estado);
    if (prioridad) query = query.eq('prioridad', prioridad);
    if (categoria) query = query.eq('categoria', categoria);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async obtener(id) {
    const { data, error } = await supabase
      .from('reclamos')
      .select(SELECT_RECLAMO)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async listarEventos(reclamoId) {
    const { data, error } = await supabase
      .from('reclamo_eventos')
      .select('*')
      .eq('reclamo_id', reclamoId)
      .order('creado_en', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listarImagenes(reclamoId) {
    const { data, error } = await supabase
      .from('reclamo_imagenes')
      .select('*')
      .eq('reclamo_id', reclamoId)
      .order('subido_en', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listarContratosActivos() {
    return contratosService.listar({ estado: 'activo' });
  },

  async crear({ contratoId, titulo, descripcion, categoria, prioridad }) {
    const { data, error } = await supabase
      .from('reclamos')
      .insert([{
        contrato_id: contratoId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        prioridad,
      }])
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async actualizar(id, { titulo, descripcion, categoria, prioridad }) {
    const { error } = await supabase
      .from('reclamos')
      .update({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        prioridad,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  async cambiarEstado(id, estado, observacion) {
    const { error } = await supabase.rpc('cambiar_estado_reclamo', {
      p_reclamo_id: id,
      p_estado: estado,
      p_observacion: observacion?.trim() || null,
    });

    if (error) throw new Error(error.message);
  },

  // En Revisión se registran las gestiones sin cambiar de estado.
  async agregarComentario(reclamoId, comentario) {
    const texto = comentario?.trim();
    if (!texto) throw new Error('Escribí el comentario.');

    const { estado } = await this.obtener(reclamoId);
    if (estado !== ESTADO_RECLAMO.REVISION) {
      throw new Error('Solo se pueden agregar comentarios a un reclamo en revisión.');
    }

    const { error } = await supabase.from('reclamo_eventos').insert([{
      reclamo_id: reclamoId,
      estado_anterior: estado,
      estado_nuevo: estado,
      observacion: texto,
    }]);
    if (error) throw new Error(error.message);
  },

  async eliminar(id) {
    const imagenes = await this.listarImagenes(id);
    if (imagenes.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('reclamos-imagenes')
        .remove(imagenes.map((imagen) => imagen.ruta_storage));
      if (storageError) throw new Error(storageError.message);
    }

    const { error } = await supabase.from('reclamos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async subirImagenes(reclamoId, archivos, yaCargadas = 0) {
    const lista = Array.from(archivos || []);
    if (lista.length === 0) return;
    if (yaCargadas + lista.length > 5) {
      throw new Error('Un reclamo admite hasta 5 imágenes.');
    }

    for (const archivo of lista) {
      if (!archivo.type.startsWith('image/')) {
        throw new Error('Solo se pueden adjuntar imágenes.');
      }
      const nombreSeguro = archivo.name.replace(/[^\w.\-]+/g, '_');
      const ruta = `${reclamoId}/${Date.now()}-${nombreSeguro}`;
      const { error: uploadError } = await supabase.storage
        .from('reclamos-imagenes')
        .upload(ruta, archivo, { upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { error: insertError } = await supabase.from('reclamo_imagenes').insert([{
        reclamo_id: reclamoId,
        nombre_archivo: archivo.name,
        ruta_storage: ruta,
        tipo_mime: archivo.type,
      }]);
      if (insertError) {
        await supabase.storage.from('reclamos-imagenes').remove([ruta]);
        throw new Error(insertError.message);
      }
    }
  },

  async eliminarImagen(imagen) {
    const { error: storageError } = await supabase.storage
      .from('reclamos-imagenes')
      .remove([imagen.ruta_storage]);
    if (storageError) throw new Error(storageError.message);

    const { error } = await supabase.from('reclamo_imagenes').delete().eq('id', imagen.id);
    if (error) throw new Error(error.message);
  },

  async descargarImagen(rutaStorage) {
    const { data, error } = await supabase.storage
      .from('reclamos-imagenes')
      .download(rutaStorage);
    if (error) throw new Error(error.message);
    return data;
  },
};

export function etiquetaContrato(contrato) {
  if (!contrato) return 'Sin contrato';
  return `${nombreInquilino(contrato.inquilinos)} · ${direccionPropiedad(contrato.propiedades)}`;
}

export function formatearFechaHora(valor) {
  if (!valor) return '';
  return new Date(valor).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
