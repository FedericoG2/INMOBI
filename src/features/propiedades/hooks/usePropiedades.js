// loading solo cubre la primera carga: al recargar se mantiene lo que ya esta en pantalla.
import { useEffect, useState } from 'react';
import { propiedadesService } from '../../../services/propiedadesService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

// Se traen todas: la pantalla filtra en el navegador y cuenta cuantas hay en cada estado.
export function usePropiedades() {
  const [propiedades, setPropiedades] = useState(() => leerCache('propiedades') ?? []);
  const [loading, setLoading] = useState(() => !leerCache('propiedades'));
  const [error, setError] = useState(null);

  const cargar = async () => {
    try {
      setError(null);
      const data = await propiedadesService.listar();
      setPropiedades(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!loading && !error) guardarCache('propiedades', propiedades);
  }, [loading, error, propiedades]);

  const crear = async (propiedad) => {
    const nueva = await propiedadesService.crear(propiedad);
    setPropiedades((prev) => [nueva, ...prev]);
    return nueva;
  };

  const actualizar = async (id, propiedad) => {
    const actualizada = await propiedadesService.actualizar(id, propiedad);
    setPropiedades((prev) => prev.map((item) => (item.id === id ? actualizada : item)));
    return actualizada;
  };

  const eliminar = async (id) => {
    await propiedadesService.eliminar(id);
    setPropiedades((prev) => prev.filter((item) => item.id !== id));
  };

  return { propiedades, loading, error, crear, actualizar, eliminar, recargar: cargar };
}
