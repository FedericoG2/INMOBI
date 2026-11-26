// loading solo cubre la primera carga: al recargar se mantiene lo que ya esta en pantalla.
import { useState, useEffect } from 'react';
import { propietariosService } from '../../../services/propietariosService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

/**
 * Hook para gestionar el estado de propietarios
 */
export function usePropietarios() {
  const [propietarios, setPropietarios] = useState(() => leerCache('propietarios') ?? []);
  const [loading, setLoading] = useState(() => !leerCache('propietarios'));
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    tipoPersona: null,
  });

  const cargarPropietarios = async () => {
    try {
      setError(null);
      const data = await propietariosService.listar(filtros);
      setPropietarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPropietarios();
  }, [filtros]);

  useEffect(() => {
    if (!loading && !error) guardarCache('propietarios', propietarios);
  }, [loading, error, propietarios]);

  const crear = async (propietario) => {
    try {
      const nuevo = await propietariosService.crear(propietario);
      setPropietarios(prev => [nuevo, ...prev]);
      return nuevo;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const actualizar = async (id, propietario) => {
    try {
      const actualizado = await propietariosService.actualizar(id, propietario);
      setPropietarios(prev =>
        prev.map(p => p.id === id ? actualizado : p)
      );
      return actualizado;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const eliminar = async (id) => {
    try {
      await propietariosService.eliminar(id);
      setPropietarios(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const actualizarFiltros = (nuevosFiltros) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
  };

  const limpiarFiltros = () => {
    setFiltros({ busqueda: '', tipoPersona: null });
  };

  return {
    propietarios,
    loading,
    error,
    filtros,
    crear,
    actualizar,
    eliminar,
    actualizarFiltros,
    limpiarFiltros,
    recargar: cargarPropietarios,
  };
}
