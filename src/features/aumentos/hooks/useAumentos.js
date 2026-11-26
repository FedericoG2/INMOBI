import { useState, useEffect } from 'react';
import { aumentosService } from '../../../services/aumentosService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

// Se llama al ingresar al sistema para que el módulo ya tenga datos al abrirlo.
export async function precargarAumentos() {
  const { anio, mes } = aumentosService.obtenerPeriodoTrabajo();
  const clave = `aumentos:${anio}-${mes}:`;
  if (leerCache(clave)) return;
  try {
    let completa = false;
    const data = await aumentosService.listar({
      anio,
      mes,
      onBase: (base) => {
        if (!completa && !leerCache(clave)) guardarCache(clave, base);
      },
    });
    completa = true;
    guardarCache(clave, data);
  } catch {
    // Si falla, el módulo lo pide al abrirse y muestra el error.
  }
}

export function useAumentos({ anio, mes, estado } = {}) {
  // loading solo cubre la primera carga: al recargar se mantiene lo que ya está en pantalla.
  const clave = `aumentos:${anio}-${mes}:${estado || ''}`;
  const [aumentos, setAumentos] = useState(() => leerCache(clave) ?? []);
  const [loading, setLoading] = useState(() => !leerCache(clave));
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const [periodoCargado, setPeriodoCargado] = useState(() => (leerCache(clave) ? `${anio}-${mes}` : null));
  const clavePeriodo = `${anio}-${mes}`;

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setError(null);
      const guardado = leerCache(clave);
      if (guardado) {
        setAumentos(guardado);
        setPeriodoCargado(`${anio}-${mes}`);
      }
      try {
        const data = await aumentosService.listar({
          anio,
          mes,
          estado,
          onBase: (base) => {
            // Si ya hay montos calculados en pantalla, no se reemplazan.
            if (!vigente || leerCache(clave)) return;
            setAumentos(base);
            setPeriodoCargado(`${anio}-${mes}`);
            setLoading(false);
          },
        });
        // Un pedido viejo no pisa lo que ya se actualizó.
        if (vigente) {
          guardarCache(clave, data);
          setAumentos(data);
          setPeriodoCargado(`${anio}-${mes}`);
        }
      } catch (err) {
        if (vigente) {
          setError(err.message);
        }
      } finally {
        if (vigente) {
          setLoading(false);
        }
      }
    }

    cargar();

    return () => {
      vigente = false;
    };
  }, [clave, anio, mes, estado, version]);

  function recargar() {
    setVersion(v => v + 1);
  }

  // Refleja un cambio en la lista al instante, mientras se vuelve a consultar.
  function actualizarFila(id, cambios) {
    setAumentos((actuales) => {
      const nuevos = actuales.map((aumento) => (aumento.id === id ? { ...aumento, ...cambios } : aumento));
      guardarCache(clave, nuevos);
      return nuevos;
    });
  }

  const cambiandoPeriodo = periodoCargado !== clavePeriodo;

  return { aumentos, loading, cambiandoPeriodo, error, recargar, actualizarFila };
}

export function useAumentoDetalle(aumentoId) {
  const [aumento, setAumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!aumentoId) {
      setLoading(false);
      return;
    }

    let vigente = true;

    async function cargar() {
      setError(null);
      try {
        const data = await aumentosService.obtener(aumentoId);
        if (vigente) {
          setAumento(data);
        }
      } catch (err) {
        if (vigente) {
          setError(err.message);
        }
      } finally {
        if (vigente) {
          setLoading(false);
        }
      }
    }

    cargar();

    return () => {
      vigente = false;
    };
  }, [aumentoId, version]);

  function recargar() {
    setVersion(v => v + 1);
  }

  return { aumento, loading, error, recargar };
}
