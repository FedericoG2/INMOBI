import { supabase } from '../lib/supabase';
import { sincronizarContratos } from './activacionContratos';
import { ESTADO_AUMENTO, ESTADO_CONTRATO, ESTADO_RECLAMO } from '../constants/estados';
import { indicesService } from './indicesService';

const SELECT_CONTRATO_CORTO = `
  id,
  fecha_fin,
  monto_actual,
  estado,
  inquilinos (
    tipo_persona,
    nombre,
    apellido,
    razon_social
  ),
  propiedades (
    codigo,
    calle,
    numero,
    piso,
    departamento,
    localidad
  )
`;

const SELECT_RECLAMO_CORTO = `
  id,
  titulo,
  prioridad,
  categoria,
  creado_en,
  contratos (
    inquilinos (
      tipo_persona,
      nombre,
      apellido,
      razon_social
    ),
    propiedades (
      codigo,
      calle,
      numero,
      piso,
      departamento,
      localidad
    )
  )
`;

function fechaISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function hoy() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

async function contar(tabla, aplicar) {
  let query = supabase.from(tabla).select('id', { count: 'exact', head: true });
  if (aplicar) query = aplicar(query);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const dashboardService = {
  async obtenerIndicadores() {
    await sincronizarContratos();
    const desde = fechaISO(hoy());
    const hasta = fechaISO(new Date(hoy().getTime() + 60 * 24 * 60 * 60 * 1000));

    const [propiedades, contratosActivos, contratosPorVencer, aumentosPendientes, cobrosVencidos, reclamosPendientes] = await Promise.all([
      contar('propiedades'),
      contar('contratos', (query) => query.eq('estado', ESTADO_CONTRATO.ACTIVO)),
      contar('contratos', (query) => query
        .eq('estado', ESTADO_CONTRATO.ACTIVO)
        .gte('fecha_fin', desde)
        .lte('fecha_fin', hasta)),
      contar('aumentos', (query) => query.eq('estado', ESTADO_AUMENTO.PENDIENTE)),
      contar('periodos_alquiler', (query) => query.eq('estado', 'adeudado')),
      contar('reclamos', (query) => query.eq('estado', ESTADO_RECLAMO.PENDIENTE)),
    ]);

    return {
      propiedades,
      contratosActivos,
      contratosPorVencer,
      aumentosPendientes,
      cobrosVencidos,
      reclamosPendientes,
    };
  },

  async listarContratosPorVencer() {
    await sincronizarContratos();
    const desde = fechaISO(hoy());
    const hasta = fechaISO(new Date(hoy().getTime() + 60 * 24 * 60 * 60 * 1000));
    const { data, error } = await supabase
      .from('contratos')
      .select(SELECT_CONTRATO_CORTO)
      .eq('estado', ESTADO_CONTRATO.ACTIVO)
      .gte('fecha_fin', desde)
      .lte('fecha_fin', hasta)
      .order('fecha_fin', { ascending: true })
      .limit(8);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listarReclamosPendientes() {
    const { data, error } = await supabase
      .from('reclamos')
      .select(SELECT_RECLAMO_CORTO)
      .eq('estado', ESTADO_RECLAMO.PENDIENTE)
      .order('creado_en', { ascending: true })
      .limit(8);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async obtenerEvolucionIPC() {
    const hasta = new Date(hoy().getFullYear(), hoy().getMonth() - 1, 1);
    const desde = new Date(hasta.getFullYear(), hasta.getMonth() - 11, 1);
    const desdeTexto = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}`;
    const hastaTexto = `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, '0')}`;
    const serie = await indicesService.obtenerIPC(desdeTexto, hastaTexto);
    return [...serie].sort((a, b) => a.anio - b.anio || a.mes - b.mes);
  },
};
