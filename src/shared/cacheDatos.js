import { supabase } from '../lib/supabase';

// Guarda en memoria lo último que mostró cada pantalla: al volver a entrar se ve al
// instante y se actualiza por detrás. No persiste al recargar la página.
const memoria = new Map();
let usuario = null;

// Al cerrar sesión o cambiar de usuario no puede quedar nada del anterior.
supabase.auth.onAuthStateChange((evento, sesion) => {
  const actual = sesion?.user?.id ?? null;
  if (actual !== usuario) memoria.clear();
  usuario = actual;
});

export function leerCache(clave) {
  return memoria.get(clave);
}

export function guardarCache(clave, valor) {
  memoria.set(clave, valor);
}
