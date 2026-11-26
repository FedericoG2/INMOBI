import { supabase } from '../lib/supabase';
import { activarContratosProgramados } from './activacionContratos';
import { exigirPropiedadUnica } from './duplicados';

const SELECT_PROPIEDAD = `
  *,
  propietarios (
    id,
    tipo_persona,
    documento,
    nombre,
    apellido,
    razon_social
  ),
  contratos (
    id,
    estado,
    fecha_inicio,
    fecha_fin,
    monto_actual,
    inquilinos (
      tipo_persona,
      nombre,
      apellido,
      razon_social
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

export const propiedadesService = {
  async listar({ busqueda = '', tipo = null, estado = null, propietarioId = null } = {}) {
    await activarContratosProgramados();
    let query = supabase
      .from('propiedades')
      .select(SELECT_PROPIEDAD)
      .order('creado_en', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo);
    if (estado) query = query.eq('estado', estado);
    if (propietarioId) query = query.eq('propietario_id', propietarioId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const texto = busqueda.trim().toLowerCase();
    if (!texto) return data;

    return data.filter((propiedad) => {
      const propietario = nombrePropietario(propiedad.propietarios);
      const campos = [
        propiedad.codigo,
        propiedad.calle,
        propiedad.numero,
        propiedad.piso,
        propiedad.departamento,
        propiedad.localidad,
        propiedad.provincia,
        propietario,
      ];
      return campos.some((campo) => String(campo || '').toLowerCase().includes(texto));
    });
  },

  async obtenerPorId(id) {
    const { data, error } = await supabase
      .from('propiedades')
      .select(SELECT_PROPIEDAD)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async crear(propiedad) {
    await exigirPropiedadUnica(propiedad);
    const { data, error } = await supabase
      .from('propiedades')
      .insert([propiedad])
      .select(SELECT_PROPIEDAD)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async actualizar(id, propiedad) {
    await exigirPropiedadUnica(propiedad, id);
    const { data, error } = await supabase
      .from('propiedades')
      .update(propiedad)
      .eq('id', id)
      .select(SELECT_PROPIEDAD)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async eliminar(id) {
    const { error } = await supabase
      .from('propiedades')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};

export function nombrePropietario(propietario) {
  if (!propietario) return 'Sin propietario';
  if (propietario.tipo_persona === 'juridica') return propietario.razon_social || 'Sin razón social';
  return `${propietario.nombre || ''} ${propietario.apellido || ''}`.trim() || 'Sin nombre';
}

export function direccionPropiedad(propiedad) {
  const unidad = [propiedad.piso && `Piso ${propiedad.piso}`, propiedad.departamento && `Depto ${propiedad.departamento}`]
    .filter(Boolean)
    .join(', ');
  const linea1 = `${propiedad.calle} ${propiedad.numero}${unidad ? ` (${unidad})` : ''}`;
  return `${linea1}, ${propiedad.localidad}, ${propiedad.provincia}`;
}
