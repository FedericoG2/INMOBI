import { supabase } from '../lib/supabase';
import { exigirPersonaUnica } from './duplicados';

/**
 * Servicio para gestión de propietarios
 */
const SELECT_PROPIETARIO = `
  *,
  propiedades (id, codigo, tipo, estado, calle, numero, piso, departamento, localidad, provincia)
`;

export const propietariosService = {
  /**
   * Listar todos los propietarios con búsqueda/filtros
   */
  async listar({ busqueda = '', tipoPersona = null } = {}) {
    let query = supabase
      .from('propietarios')
      .select(SELECT_PROPIETARIO)
      .order('creado_en', { ascending: false });

    // Filtro por tipo de persona
    if (tipoPersona) {
      query = query.eq('tipo_persona', tipoPersona);
    }

    // Búsqueda por documento, nombre, apellido, razón social o email
    if (busqueda) {
      query = query.or(
        `documento.ilike.%${busqueda}%,` +
        `nombre.ilike.%${busqueda}%,` +
        `apellido.ilike.%${busqueda}%,` +
        `razon_social.ilike.%${busqueda}%,` +
        `email.ilike.%${busqueda}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Obtener un propietario por ID
   */
  async obtenerPorId(id) {
    const { data, error } = await supabase
      .from('propietarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Crear un nuevo propietario
   */
  async crear(propietario) {
    await exigirPersonaUnica('propietarios', 'propietario', propietario);
    const { data, error } = await supabase
      .from('propietarios')
      .insert([propietario])
      .select(SELECT_PROPIETARIO)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Actualizar un propietario existente
   */
  async actualizar(id, propietario) {
    await exigirPersonaUnica('propietarios', 'propietario', propietario, id);
    const { data, error } = await supabase
      .from('propietarios')
      .update(propietario)
      .eq('id', id)
      .select(SELECT_PROPIETARIO)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Eliminar un propietario
   */
  async eliminar(id) {
    const { error } = await supabase
      .from('propietarios')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Obtener propiedades asociadas a un propietario
   */
  async obtenerPropiedades(propietarioId) {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*')
      .eq('propietario_id', propietarioId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};
