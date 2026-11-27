import { supabase } from '../lib/supabase';

// Pone al día los estados que dependen de la fecha: activa los contratos programados
// que ya empezaron y finaliza los activos que ya vencieron. La base se encarga del
// resto (estado de la propiedad y períodos de alquiler). También pasa a Adeudado
// el alquiler pendiente cuyo vencimiento ya pasó.
// Se consulta una vez por día y por sesión; las pantallas lo esperan antes de listar.
let pedido = null;

async function ejecutar(funcion) {
  const { error } = await supabase.rpc(funcion);
  if (error) throw new Error(error.message);
}

export function sincronizarContratos() {
  const hoy = new Date().toDateString();

  if (pedido?.dia !== hoy) {
    const promesa = ejecutar('activar_contratos_programados')
      .then(() => ejecutar('finalizar_contratos_vencidos'))
      .then(() => ejecutar('marcar_periodos_adeudados'))
      .catch((error) => {
        // No impide ver las pantallas; el próximo listado vuelve a intentarlo.
        console.error('No se pudieron actualizar los estados de los contratos:', error.message);
        pedido = null;
      });
    pedido = { dia: hoy, promesa };
  }

  return pedido.promesa;
}
