import { supabase } from '../lib/supabase';

// Control de registros repetidos antes de guardar.

// Sin tildes, mayúsculas, espacios ni signos: "Av. Colón" y "av colon" son lo mismo.
function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

const CAMPOS_DIRECCION = ['calle', 'numero', 'piso', 'departamento', 'localidad', 'provincia'];

function claveDireccion(propiedad) {
  return CAMPOS_DIRECCION.map((campo) => normalizar(propiedad[campo])).join('|');
}

// En una persona física el CUIL contiene al DNI: ambos identifican a la misma persona.
function claveDocumento({ tipo_persona: tipo, documento }) {
  const numero = String(documento || '').replace(/\D/g, '');
  if (tipo !== 'fisica') return numero;
  return (numero.length === 11 ? numero.slice(2, 10) : numero).replace(/^0+/, '');
}

export function errorEnCampo(campo, mensaje) {
  return Object.assign(new Error(mensaje), { campo });
}

export async function exigirPersonaUnica(tabla, entidad, persona, idPropio = null) {
  const { data, error } = await supabase.from(tabla).select('id, tipo_persona, documento, nombre, apellido, razon_social');
  if (error) throw new Error(error.message);

  const clave = claveDocumento(persona);
  const repetida = data.find((otra) => otra.id !== idPropio && claveDocumento(otra) === clave);
  if (!repetida) return;

  const nombre = repetida.razon_social || `${repetida.nombre || ''} ${repetida.apellido || ''}`.trim();
  throw errorEnCampo('documento', `Ya existe un ${entidad} con ese documento: ${nombre} (${repetida.documento}).`);
}

export async function exigirPropiedadUnica(propiedad, idPropio = null) {
  const { data, error } = await supabase.from('propiedades').select(`id, codigo, ${CAMPOS_DIRECCION.join(', ')}`);
  if (error) throw new Error(error.message);
  const otras = data.filter((otra) => otra.id !== idPropio);

  const codigo = normalizar(propiedad.codigo);
  if (codigo && otras.some((otra) => normalizar(otra.codigo) === codigo)) {
    throw errorEnCampo('codigo', `Ya existe una propiedad con el código ${propiedad.codigo}.`);
  }

  const direccion = claveDireccion(propiedad);
  const repetida = otras.find((otra) => claveDireccion(otra) === direccion);
  if (repetida) {
    const referencia = repetida.codigo ? ` (código ${repetida.codigo})` : '';
    throw errorEnCampo('calle', `Ya existe una propiedad cargada en esa dirección${referencia}.`);
  }
}
