import { supabase } from '../lib/supabase';

// Activa los contratos programados cuya fecha de inicio ya llegó. La base se encarga
// de pasar la propiedad a 'alquilada' y de generar los períodos de alquiler.
// Se consulta una vez por día y por sesión; las pantallas lo esperan antes de listar.
let pedido = null;

export function activarContratosProgramados() {
  const hoy = new Date().toDateString();

  if (pedido?.dia !== hoy) {
    const promesa = supabase.rpc('activar_contratos_programados').then(({ error }) => {
      if (error) throw new Error(error.message);
    }).catch((error) => {
      // No impide ver las pantallas; el próximo listado vuelve a intentarlo.
      console.error('No se pudieron activar los contratos programados:', error.message);
      pedido = null;
    });
    pedido = { dia: hoy, promesa };
  }

  return pedido.promesa;
}
