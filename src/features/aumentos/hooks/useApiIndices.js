import { useEffect, useState } from 'react';
import { indicesService } from '../../../services/indicesService';

// Estado de la API de índices: 'consultando', 'ok' o 'falla'.
// Se vuelve a verificar al regresar a la pestaña.
export function useApiIndices() {
  const [estado, setEstado] = useState('consultando');

  useEffect(() => {
    let vigente = true;
    const verificar = () => {
      indicesService.verificarApi().then((responde) => {
        if (vigente) setEstado(responde ? 'ok' : 'falla');
      });
    };
    verificar();
    window.addEventListener('focus', verificar);
    return () => {
      vigente = false;
      window.removeEventListener('focus', verificar);
    };
  }, []);

  return { estado };
}