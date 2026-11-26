import { supabase } from '../lib/supabase';
import { exigirPersonaUnica } from './duplicados';

const SELECT_INQUILINO = `
  *,
  contratos (
    id,
    estado,
    fecha_inicio,
    fecha_fin,
    monto_actual,
    propiedades (
      codigo,
      calle,
      numero,
      piso,
      departamento,
      localidad,
      provincia
    ),
    reclamos (
      id,
      titulo,
      categoria,
      prioridad,
      estado,
      creado_en
    )
  )
`;

export const inquilinosService = {
  async listar({ busqueda = '', tipoPersona = null, portal = null } = {}) {
    let query = supabase
      .from('inquilinos')
      .select(SELECT_INQUILINO)
      .order('creado_en', { ascending: false });

    if (tipoPersona) query = query.eq('tipo_persona', tipoPersona);
    if (portal === 'habilitado') query = query.not('usuario_id', 'is', null);
    if (portal === 'sin_acceso') query = query.is('usuario_id', null);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const texto = busqueda.trim().toLowerCase();
    if (!texto) return data;

    return data.filter((inquilino) => {
      const campos = [
        inquilino.documento,
        inquilino.nombre,
        inquilino.apellido,
        inquilino.razon_social,
        inquilino.email,
        inquilino.telefono,
      ];
      return campos.some((campo) => String(campo || '').toLowerCase().includes(texto));
    });
  },

  async crear(inquilino) {
    await exigirPersonaUnica('inquilinos', 'inquilino', inquilino);
    const { data, error } = await supabase
      .from('inquilinos')
      .insert([inquilino])
      .select(SELECT_INQUILINO)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async actualizar(id, inquilino) {
    await exigirPersonaUnica('inquilinos', 'inquilino', inquilino, id);
    const { data, error } = await supabase
      .from('inquilinos')
      .update(inquilino)
      .eq('id', id)
      .select(SELECT_INQUILINO)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async eliminar(id) {
    const { error } = await supabase.from('inquilinos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export function nombreInquilino(inquilino) {
  if (!inquilino) return '';
  if (inquilino.tipo_persona === 'juridica') return inquilino.razon_social || 'Sin razón social';
  return `${inquilino.nombre || ''} ${inquilino.apellido || ''}`.trim() || 'Sin nombre';
}
