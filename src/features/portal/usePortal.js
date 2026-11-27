import { useCallback, useEffect, useState } from 'react';
import { guardarCache, leerCache } from '../../shared/cacheDatos';
import { portalService } from './portalService';

// loading solo cubre la primera carga: al volver a una pantalla se muestra lo ya traído.
export function usePortal(rol) {
  const clave = `portal:${rol}`;
  const [datos, setDatos] = useState(() => leerCache(clave) ?? null);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    try {
      const nuevos = await portalService.obtenerDatos(rol);
      guardarCache(clave, nuevos);
      setDatos(nuevos);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [rol, clave]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
  }, [recargar]);

  return { datos, error, loading: !datos && !error, recargar };
}
