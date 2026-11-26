import { precargarAumentos } from '../features/aumentos/hooks/useAumentos';
import { alquileresService } from '../services/alquileresService';
import { contratosService } from '../services/contratosService';
import { dashboardService } from '../services/dashboardService';
import { inquilinosService } from '../services/inquilinosService';
import { propiedadesService } from '../services/propiedadesService';
import { propietariosService } from '../services/propietariosService';
import { reclamosService } from '../services/reclamosService';
import { guardarCache, leerCache } from '../shared/cacheDatos';

// Las claves tienen que ser las mismas que usa el hook de cada módulo.
async function guardarSiFalta(clave, pedir) {
  if (leerCache(clave) !== undefined) return leerCache(clave);
  const datos = await pedir();
  // Si la pantalla ya lo cargó mientras tanto, se respeta lo suyo.
  if (leerCache(clave) === undefined) guardarCache(clave, datos);
  return datos;
}

async function alquileres() {
  const cobranza = await guardarSiFalta('cobranza', () => alquileresService.obtenerResumenCobranza());
  const mes = cobranza.mesEnCurso;
  await guardarSiFalta(
    `alquileres:${JSON.stringify([mes, null, null, null, null, null])}`,
    () => alquileresService.listar({ mes }),
  );
}

async function dashboard() {
  await Promise.all([
    guardarSiFalta('dashboard', async () => {
      const [indicadores, contratos, reclamos] = await Promise.all([
        dashboardService.obtenerIndicadores(),
        dashboardService.listarContratosPorVencer(),
        dashboardService.listarReclamosPendientes(),
      ]);
      return { indicadores, contratos, reclamos };
    }),
    guardarSiFalta('dashboard:ipc', () => dashboardService.obtenerEvolucionIPC()),
  ]);
}

const MODULOS = {
  '/app': dashboard,
  '/app/propietarios': () => guardarSiFalta('propietarios', () => propietariosService.listar()),
  '/app/propiedades': () => guardarSiFalta('propiedades', () => propiedadesService.listar()),
  '/app/inquilinos': () => guardarSiFalta('inquilinos', () => inquilinosService.listar()),
  '/app/contratos': () => guardarSiFalta(
    `contratos:${JSON.stringify({ estado: null })}`,
    () => contratosService.listar({ estado: null }),
  ),
  '/app/alquileres': alquileres,
  '/app/aumentos': precargarAumentos,
  '/app/reclamos': () => guardarSiFalta(
    `reclamos:${JSON.stringify([null, null, null])}`,
    () => reclamosService.listar(),
  ),
};

// Se llama al ingresar al sistema: trae en segundo plano los datos de los otros módulos.
// El que está abierto se omite porque ya los está pidiendo.
export function precargarModulos(rutaActual) {
  Object.entries(MODULOS)
    .filter(([ruta]) => ruta !== rutaActual)
    // Si una falla, ese módulo lo pide al abrirse y muestra el error.
    .forEach(([, precargar]) => precargar().catch(() => {}));
}
