// loading solo cubre la primera carga: al recargar se mantiene lo que ya esta en pantalla.
import { useEffect, useState } from 'react';
import { inquilinosService } from '../../../services/inquilinosService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

export function useInquilinos() {
  const [inquilinos, setInquilinos] = useState(() => leerCache('inquilinos') ?? []);
  const [loading, setLoading] = useState(() => !leerCache('inquilinos'));
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    tipoPersona: null,
    portal: null,
  });

  const cargar = async () => {
    try {
      setError(null);
      setInquilinos(await inquilinosService.listar(filtros));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [filtros]);

  useEffect(() => {
    if (!loading && !error) guardarCache('inquilinos', inquilinos);
  }, [loading, error, inquilinos]);

  const crear = async (inquilino) => {
    const nuevo = await inquilinosService.crear(inquilino);
    setInquilinos((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const actualizar = async (id, inquilino) => {
    const actualizado = await inquilinosService.actualizar(id, inquilino);
    setInquilinos((prev) => prev.map((item) => (item.id === id ? actualizado : item)));
    return actualizado;
  };

  const eliminar = async (id) => {
    await inquilinosService.eliminar(id);
    setInquilinos((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    inquilinos,
    loading,
    error,
    filtros,
    crear,
    actualizar,
    eliminar,
    actualizarFiltros: (nuevos) => setFiltros((prev) => ({ ...prev, ...nuevos })),
    limpiarFiltros: () => setFiltros({ busqueda: '', tipoPersona: null, portal: null }),
    recargar: cargar,
  };
}
