// Consultas de los portales. Cada usuario pide solo lo vinculado a su cuenta;
// la base además lo restringe con sus políticas de seguridad.
import { supabase } from '../../lib/supabase';
import { ROL } from '../../constants/estados';
import { fechaHoyISO } from '../../services/alquileresService';
import { sincronizarContratos } from '../../services/activacionContratos';

const ESTADOS_VISIBLES = ['activo', 'finalizado', 'rescindido'];

const SELECT_CONTRATO = `
  *,
  inquilinos (id, tipo_persona, nombre, apellido, razon_social, documento),
  propiedades!inner (*)
`;

function exigir({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

const VACIO = { persona: null, propiedades: [], contratos: [], periodos: [], aumentos: [], documentos: [], reclamos: [] };

export const portalService = {
  async obtenerDatos(rol) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return VACIO;
    await sincronizarContratos();

    const esInquilino = rol === ROL.INQUILINO;
    const persona = exigir(await supabase
      .from(esInquilino ? 'inquilinos' : 'propietarios')
      .select('*')
      .eq('usuario_id', user.id)
      .maybeSingle());
    if (!persona) return VACIO;

    const propiedades = esInquilino
      ? []
      : exigir(await supabase.from('propiedades').select('*').eq('propietario_id', persona.id).order('creado_en'));

    const contratos = exigir(await supabase
      .from('contratos')
      .select(SELECT_CONTRATO)
      .eq(esInquilino ? 'inquilino_id' : 'propiedades.propietario_id', persona.id)
      .in('estado', ESTADOS_VISIBLES)
      .order('fecha_inicio', { ascending: false }));

    const ids = contratos.map((contrato) => contrato.id);
    if (ids.length === 0) return { ...VACIO, persona, propiedades };

    const [periodos, aumentos, documentos, reclamos] = await Promise.all([
      // Se muestran los meses ya comenzados, no los futuros.
      supabase.from('periodos_alquiler').select('*, comprobantes_pago (*)').in('contrato_id', ids)
        .lte('fecha_desde', fechaHoyISO()).order('fecha_desde', { ascending: false }),
      supabase.from('aumentos').select('*').in('contrato_id', ids).eq('estado', 'confirmado')
        .order('fecha_aumento', { ascending: false }),
      supabase.from('documentos_contrato').select('*').in('contrato_id', ids),
      esInquilino
        ? supabase.from('reclamos').select('*').in('contrato_id', ids).order('creado_en', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    return {
      persona,
      propiedades,
      contratos,
      periodos: exigir(periodos),
      aumentos: exigir(aumentos),
      documentos: exigir(documentos),
      reclamos: exigir(reclamos),
    };
  },

  async descargar(bucket, ruta, nombre) {
    const archivo = exigir(await supabase.storage.from(bucket).download(ruta));
    const url = window.URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    window.URL.revokeObjectURL(url);
  },
};
