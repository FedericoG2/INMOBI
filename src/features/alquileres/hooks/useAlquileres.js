// loading solo cubre la primera carga: al recargar se mantiene lo que ya esta en pantalla.
import { useCallback, useEffect, useState } from 'react';
import { alquileresService } from '../../../services/alquileresService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

export function useAlquileres(filtros = {}) {
  const {
    mes = null,
    estado = null,
    contratoId = null,
    inquilinoId = null,
    propiedadId = null,
    propietarioId = null,
  } = filtros;

  const clave = `alquileres:${JSON.stringify([mes, estado, contratoId, inquilinoId, propiedadId, propietarioId])}`;
  const [periodos, setPeriodos] = useState(() => leerCache(clave) ?? []);
  const [loading, setLoading] = useState(() => !leerCache(clave));
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  useEffect(() => {
    let vigente = true;

    async function cargarPeriodos() {
      setError(null);
      const guardado = leerCache(clave);
      if (guardado) setPeriodos(guardado);
      try {
        const data = await alquileresService.listar({
          mes,
          estado,
          contratoId,
          inquilinoId,
          propiedadId,
          propietarioId,
        });
        guardarCache(clave, data);
        if (vigente) setPeriodos(data);
      } catch (err) {
        if (vigente) setError(err.message);
      } finally {
        if (vigente) setLoading(false);
      }
    }

    cargarPeriodos();
    return () => {
      vigente = false;
    };
  }, [clave, mes, estado, contratoId, inquilinoId, propiedadId, propietarioId, version]);

  return { periodos, loading, error, recargar: cargar };
}

export function useResumenCobranza() {
  const [resumen, setResumen] = useState(() => leerCache('cobranza')
    ?? { mesEnCurso: null, vencimiento: null, pendientesMes: 0, adeudados: 0 });
  const [cargado, setCargado] = useState(() => Boolean(leerCache('cobranza')));
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  useEffect(() => {
    let vigente = true;
    alquileresService.obtenerResumenCobranza()
      .then((data) => {
        guardarCache('cobranza', data);
        if (!vigente) return;
        setResumen(data);
        setCargado(true);
      })
      .catch(() => {
        if (vigente) setCargado(true);
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  return { resumen, cargado, recargar };
}

export function usePeriodoDetalle(periodoId) {
  const [periodo, setPeriodo] = useState(null);
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  useEffect(() => {
    if (!periodoId) return undefined;
    let vigente = true;

    async function cargarDetalle() {
      setError(null);
      try {
        const [periodoData, comprobantesData] = await Promise.all([
          alquileresService.obtenerPorId(periodoId),
          alquileresService.listarComprobantes(periodoId),
        ]);
        if (!vigente) return;
        setPeriodo(periodoData);
        setComprobantes(comprobantesData);
      } catch (err) {
        if (vigente) setError(err.message);
      } finally {
        if (vigente) setLoading(false);
      }
    }

    cargarDetalle();
    return () => {
      vigente = false;
    };
  }, [periodoId, version]);

  return { periodo, comprobantes, loading, error, recargar: cargar };
}
