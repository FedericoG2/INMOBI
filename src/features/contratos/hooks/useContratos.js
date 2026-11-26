// loading solo cubre la primera carga: al recargar se mantiene lo que ya esta en pantalla.
import { useState, useEffect, useCallback } from 'react';
import { contratosService } from '../../../services/contratosService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

export function useContratos(filtros = {}) {
  const clave = `contratos:${JSON.stringify(filtros)}`;
  const [contratos, setContratos] = useState(() => leerCache(clave) ?? []);
  const [loading, setLoading] = useState(() => !leerCache(clave));
  const [error, setError] = useState(null);

  const cargarContratos = useCallback(async () => {
    setError(null);
    const guardado = leerCache(clave);
    if (guardado) setContratos(guardado);
    try {
      const data = await contratosService.listar(filtros);
      guardarCache(clave, data);
      setContratos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filtros)]);

  useEffect(() => {
    cargarContratos();
  }, [cargarContratos]);

  return {
    contratos,
    loading,
    error,
    recargar: cargarContratos,
  };
}

export function useContratoDetalle(contratoId) {
  const [contrato, setContrato] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [aumentos, setAumentos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [eliminacion, setEliminacion] = useState({ puede: false, motivos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    if (!contratoId) return;

    setError(null);
    try {
      const [contratoData, documentosData, aumentosData, periodosData] = await Promise.all([
        contratosService.obtenerPorId(contratoId),
        contratosService.listarDocumentos(contratoId),
        contratosService.listarAumentos(contratoId),
        contratosService.listarPeriodos(contratoId),
      ]);
      const evaluacion = await contratosService.evaluarEliminacion(contratoData);
      setContrato(contratoData);
      setDocumentos(documentosData);
      setAumentos(aumentosData);
      setPeriodos(periodosData);
      setEliminacion(evaluacion);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return {
    contrato,
    documentos,
    aumentos,
    periodos,
    eliminacion,
    loading,
    error,
    recargar: cargarDatos,
  };
}
