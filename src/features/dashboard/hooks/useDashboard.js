// loading solo cubre la primera carga: después se muestra lo último y se actualiza por detrás.
import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '../../../services/dashboardService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

const VACIO = { indicadores: null, contratos: [], reclamos: [] };

export function useDashboard() {
  const [datos, setDatos] = useState(() => leerCache('dashboard') ?? VACIO);
  const [ipc, setIpc] = useState(() => leerCache('dashboard:ipc') ?? []);
  const [loading, setLoading] = useState(() => !leerCache('dashboard'));
  const [error, setError] = useState('');
  const [errorIpc, setErrorIpc] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    setErrorIpc('');

    // El IPC viene de un servicio externo: se pide aparte para no demorar el panel.
    dashboardService.obtenerEvolucionIPC().then(
      (serie) => {
        guardarCache('dashboard:ipc', serie);
        setIpc(serie);
      },
      () => setErrorIpc('No se pudo obtener la evolución del IPC.'),
    );

    try {
      const [indicadores, contratos, reclamos] = await Promise.all([
        dashboardService.obtenerIndicadores(),
        dashboardService.listarContratosPorVencer(),
        dashboardService.listarReclamosPendientes(),
      ]);
      const nuevos = { indicadores, contratos, reclamos };
      guardarCache('dashboard', nuevos);
      setDatos(nuevos);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { ...datos, ipc, loading, error, errorIpc, recargar: cargar };
}
