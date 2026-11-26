import { supabase } from '../lib/supabase';

function errorDe(error) {
  const mensaje = error?.message || 'No se pudo completar la operación';
  return new Error(mensaje.replace(/^.*ERROR:\s*/i, ''));
}

export const cuentasService = {
  async miPerfil() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error(authError.message);
    if (!user) return null;

    const { data, error } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (error) throw errorDe(error);
    return data;
  },

  async listar() {
    const { data, error } = await supabase.rpc('listar_cuentas');
    if (error) throw errorDe(error);
    return data || [];
  },

  async listarInquilinos() {
    const { data, error } = await supabase
      .from('inquilinos')
      .select('id, tipo_persona, nombre, apellido, razon_social, documento, usuario_id')
      .order('creado_en', { ascending: false });
    if (error) throw errorDe(error);
    return data || [];
  },

  async listarPropietarios() {
    const { data, error } = await supabase
      .from('propietarios')
      .select('id, tipo_persona, nombre, apellido, razon_social, documento, usuario_id')
      .order('creado_en', { ascending: false });
    if (error) throw errorDe(error);
    return data || [];
  },

  async crear({ email, clave, rol, inquilinoId, propietarioId }) {
    const { data, error } = await supabase.rpc('crear_cuenta', {
      p_email: email,
      p_clave: clave,
      p_rol: rol,
      p_inquilino_id: inquilinoId || null,
      p_propietario_id: propietarioId || null,
    });
    if (error) throw errorDe(error);
    return data;
  },

  async actualizar({ usuarioId, rol, inquilinoId, propietarioId }) {
    const { error } = await supabase.rpc('actualizar_cuenta', {
      p_usuario_id: usuarioId,
      p_rol: rol,
      p_inquilino_id: inquilinoId || null,
      p_propietario_id: propietarioId || null,
    });
    if (error) throw errorDe(error);
  },

  async bloquear(usuarioId) {
    const { error } = await supabase.rpc('bloquear_cuenta', { p_usuario_id: usuarioId });
    if (error) throw errorDe(error);
  },

  async desbloquear(usuarioId) {
    const { error } = await supabase.rpc('desbloquear_cuenta', { p_usuario_id: usuarioId });
    if (error) throw errorDe(error);
  },

  async cambiarClave(usuarioId, clave) {
    const { error } = await supabase.rpc('cambiar_clave_cuenta', {
      p_usuario_id: usuarioId,
      p_clave: clave,
    });
    if (error) throw errorDe(error);
  },
};
