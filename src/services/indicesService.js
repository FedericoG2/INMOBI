// Servicio para consultar índices IPC e ICL desde Argly
import { supabase } from '../lib/supabase';

const ARGLY_API_URL = import.meta.env.DEV ? '/argly' : 'https://api.argly.com.ar';

// Los indices publicados casi no cambian: se reutiliza cada respuesta unos minutos
// para no esperar a Argly en cada refresco de pantalla.
const VIGENCIA_CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

// Si la API no responde en este tiempo se considera caída.
const ESPERA_MAXIMA_MS = 8000;

// Interruptor alojado en la base para simular una caída. La app solo lo lee: se cambia desde Supabase.
const VIGENCIA_INTERRUPTOR_MS = 5000;
let interruptor = null;

function fallaSimulada() {
  if (!interruptor || Date.now() - interruptor.pedidoEn >= VIGENCIA_INTERRUPTOR_MS) {
    const promesa = supabase
      .from('interruptores')
      .select('activo')
      .eq('clave', 'simular_falla_indices')
      .maybeSingle()
      // Si no se puede leer, la API se usa con normalidad.
      .then(({ data }) => data?.activo === true, () => false);
    interruptor = { promesa, pedidoEn: Date.now() };
  }
  return interruptor.promesa;
}

async function pedirDatos(url) {
  if (await fallaSimulada()) throw new Error('Falla de la API de índices (simulada)');

  const guardado = cache.get(url);
  if (guardado && Date.now() - guardado.pedidoEn < VIGENCIA_CACHE_MS) return guardado.promesa;

  const promesa = fetch(url, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) }).then(async (response) => {
    if (!response.ok) throw new Error(`Argly respondio ${response.status}`);
    const json = await response.json();
    return json.data || [];
  });
  cache.set(url, { promesa, pedidoEn: Date.now() });
  // Un error no se guarda: el proximo intento vuelve a consultar.
  promesa.catch(() => cache.delete(url));
  return promesa;
}

export const indicesService = {
  /**
   * Indica si la API de índices responde (IPC e ICL).
   * Que un índice todavía no esté publicado no es una falla.
   * @returns {Promise<boolean>}
   */
  async verificarApi() {
    const hoy = new Date();
    const dia = (fecha) => fecha.toISOString().slice(0, 10);
    const antes = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
    try {
      await Promise.all([
        pedirDatos(`${ARGLY_API_URL}/v1/ipc?desde=${dia(antes).slice(0, 7)}&hasta=${dia(hoy).slice(0, 7)}`),
        pedirDatos(`${ARGLY_API_URL}/v1/icl?desde=${dia(antes)}&hasta=${dia(hoy)}`),
      ]);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Obtener variaciones de IPC en un rango de meses
   * @param {string} desde - YYYY-MM
   * @param {string} hasta - YYYY-MM
   * @returns {Promise<Array>} [{mes, anio, nombre_mes, valor}]
   */
  async obtenerIPC(desde, hasta) {
    try {
      const url = `${ARGLY_API_URL}/v1/ipc?desde=${desde}&hasta=${hasta}`;
      return await pedirDatos(url);
    } catch (error) {
      console.error('Error al obtener IPC:', error);
      throw new Error('No se pudo obtener el IPC desde Argly');
    }
  },

  /**
   * Obtener valores de ICL en un rango de fechas
   * @param {string} desde - YYYY-MM-DD
   * @param {string} hasta - YYYY-MM-DD
   * @returns {Promise<Array>} [{fecha, valor}]
   */
  async obtenerICL(desde, hasta) {
    try {
      const url = `${ARGLY_API_URL}/v1/icl?desde=${desde}&hasta=${hasta}`;
      return await pedirDatos(url);
    } catch (error) {
      console.error('Error al obtener ICL:', error);
      throw new Error('No se pudo obtener el ICL desde Argly');
    }
  },

  /**
   * Buscar el valor de ICL para una fecha específica
   * @param {Array} valores - array de {fecha, valor}
   * @param {string} fecha - YYYY-MM-DD
   * @returns {number|null}
   */
  buscarICL(valores, fecha) {
    const item = valores.find(v => v.fecha === this.formatearFechaICL(fecha));
    return item ? parseFloat(item.valor) : null;
  },

  /**
   * Formatear fecha para comparación con ICL (DD/MM/YYYY)
   */
  formatearFechaICL(fechaISO) {
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  },
};
