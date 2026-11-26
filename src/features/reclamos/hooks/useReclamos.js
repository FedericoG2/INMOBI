// loading solo cubre la primera carga: al recargar se mantiene lo que ya esta en pantalla.
import { useEffect, useState } from 'react';
import { reclamosService } from '../../../services/reclamosService';
import { guardarCache, leerCache } from '../../../shared/cacheDatos';

export function useReclamos({ estado = null, prioridad = null, categoria = null } = {}) {
  const clave = `reclamos:${JSON.stringify([estado, prioridad, categoria])}`;
  const [reclamos, setReclamos] = useState(() => leerCache(clave) ?? []);
  const [loading, setLoading] = useState(() => !leerCache(clave));
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setError(null);
      try {
        const data = await reclamosService.listar({ estado, prioridad, categoria });
        guardarCache(clave, data);
        if (vigente) setReclamos(data);
      } catch (err) {
        if (vigente) setError(err.message);
      } finally {
        if (vigente) setLoading(false);
      }
    }

    cargar();
    return () => {
      vigente = false;
    };
  }, [clave, estado, prioridad, categoria, version]);

  function recargar() {
    setVersion((valor) => valor + 1);
  }

  return { reclamos, loading, error, recargar };
}

export function useReclamoDetalle(reclamoId) {
  const [reclamo, setReclamo] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!reclamoId) {
      setLoading(false);
      return;
    }

    let vigente = true;

    async function cargar() {
      setError(null);
      try {
        const [dato, historial, fotos] = await Promise.all([
          reclamosService.obtener(reclamoId),
          reclamosService.listarEventos(reclamoId),
          reclamosService.listarImagenes(reclamoId),
        ]);
        if (!vigente) return;
        setReclamo(dato);
        setEventos(historial);
        setImagenes(fotos);
      } catch (err) {
        if (vigente) setError(err.message);
      } finally {
        if (vigente) setLoading(false);
      }
    }

    cargar();
    return () => {
      vigente = false;
    };
  }, [reclamoId, version]);

  function recargar() {
    setVersion((valor) => valor + 1);
  }

  return { reclamo, eventos, imagenes, loading, error, recargar };
}
