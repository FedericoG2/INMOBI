// Enums alineados con la base de datos de Supabase

export const TIPO_PERSONA = {
  FISICA: 'fisica',
  JURIDICA: 'juridica',
};

export const TIPO_PROPIEDAD = {
  DEPARTAMENTO: 'departamento',
  CASA: 'casa',
  LOCAL_COMERCIAL: 'local_comercial',
};

export const ESTADO_PROPIEDAD = {
  DISPONIBLE: 'disponible',
  MANTENIMIENTO: 'mantenimiento',
  RESERVADA: 'reservada',
  ALQUILADA: 'alquilada',
};

export const ESTADO_CONTRATO = {
  PROGRAMADO: 'programado',
  ACTIVO: 'activo',
  FINALIZADO: 'finalizado',
  CANCELADO: 'cancelado',
  RESCINDIDO: 'rescindido',
};

export const TIPO_AJUSTE = {
  IPC: 'ipc',
  ICL: 'icl',
};

export const PERIODICIDAD_AJUSTE = {
  TRIMESTRAL: 'trimestral',
  CUATRIMESTRAL: 'cuatrimestral',
  SEMESTRAL: 'semestral',
  ANUAL: 'anual',
};

export const MOTIVO_CIERRE = {
  VENCIMIENTO: 'vencimiento',
  ACUERDO_PARTES: 'acuerdo_partes',
  FALTA_PAGO: 'falta_pago',
  OTRO: 'otro',
};

export const ESTADO_PERIODO_ALQUILER = {
  PENDIENTE: 'pendiente',
  ADEUDADO: 'adeudado',
  PAGADO: 'pagado',
};

export const ESTADO_AUMENTO = {
  PENDIENTE: 'pendiente',
  CONFIRMADO: 'confirmado',
};

// Labels para mostrar en la UI
export const TIPO_PERSONA_LABELS = {
  [TIPO_PERSONA.FISICA]: 'Física',
  [TIPO_PERSONA.JURIDICA]: 'Jurídica',
};

export const TIPO_PROPIEDAD_LABELS = {
  [TIPO_PROPIEDAD.DEPARTAMENTO]: 'Departamento',
  [TIPO_PROPIEDAD.CASA]: 'Casa',
  [TIPO_PROPIEDAD.LOCAL_COMERCIAL]: 'Local Comercial',
};

export const ESTADO_PROPIEDAD_LABELS = {
  [ESTADO_PROPIEDAD.DISPONIBLE]: 'Disponible',
  [ESTADO_PROPIEDAD.MANTENIMIENTO]: 'Mantenimiento',
  [ESTADO_PROPIEDAD.RESERVADA]: 'Reservada',
  [ESTADO_PROPIEDAD.ALQUILADA]: 'Alquilada',
};

export const ESTADO_CONTRATO_LABELS = {
  [ESTADO_CONTRATO.PROGRAMADO]: 'Programado',
  [ESTADO_CONTRATO.ACTIVO]: 'Activo',
  [ESTADO_CONTRATO.FINALIZADO]: 'Finalizado',
  [ESTADO_CONTRATO.CANCELADO]: 'Cancelado',
  [ESTADO_CONTRATO.RESCINDIDO]: 'Rescindido',
};

export const TIPO_AJUSTE_LABELS = {
  [TIPO_AJUSTE.IPC]: 'IPC',
  [TIPO_AJUSTE.ICL]: 'ICL',
};

export const PERIODICIDAD_AJUSTE_LABELS = {
  [PERIODICIDAD_AJUSTE.TRIMESTRAL]: 'Trimestral',
  [PERIODICIDAD_AJUSTE.CUATRIMESTRAL]: 'Cuatrimestral',
  [PERIODICIDAD_AJUSTE.SEMESTRAL]: 'Semestral',
  [PERIODICIDAD_AJUSTE.ANUAL]: 'Anual',
};

export const MOTIVO_CIERRE_LABELS = {
  [MOTIVO_CIERRE.VENCIMIENTO]: 'Vencimiento',
  [MOTIVO_CIERRE.ACUERDO_PARTES]: 'Acuerdo de partes',
  [MOTIVO_CIERRE.FALTA_PAGO]: 'Falta de pago',
  [MOTIVO_CIERRE.OTRO]: 'Otro',
};

export const ESTADO_PERIODO_ALQUILER_LABELS = {
  [ESTADO_PERIODO_ALQUILER.PENDIENTE]: 'Pendiente',
  [ESTADO_PERIODO_ALQUILER.ADEUDADO]: 'Adeudado',
  [ESTADO_PERIODO_ALQUILER.PAGADO]: 'Pagado',
};

export const ESTADO_AUMENTO_LABELS = {
  [ESTADO_AUMENTO.PENDIENTE]: 'Pendiente',
  [ESTADO_AUMENTO.CONFIRMADO]: 'Confirmado',
};

export const ESTADO_RECLAMO = {
  PENDIENTE: 'pendiente',
  EN_PROCESO: 'en_proceso',
  REVISION: 'revision',
  RESUELTO: 'resuelto',
};

export const CATEGORIA_RECLAMO = {
  PLOMERIA: 'plomeria',
  ELECTRICIDAD: 'electricidad',
  GAS: 'gas',
  HUMEDAD: 'humedad',
  ABERTURAS: 'aberturas',
  OTROS: 'otros',
};

export const PRIORIDAD_RECLAMO = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
};

export const ESTADO_RECLAMO_LABELS = {
  [ESTADO_RECLAMO.PENDIENTE]: 'Pendiente',
  [ESTADO_RECLAMO.EN_PROCESO]: 'En proceso',
  [ESTADO_RECLAMO.REVISION]: 'Revisión',
  [ESTADO_RECLAMO.RESUELTO]: 'Resuelto',
};

export const CATEGORIA_RECLAMO_LABELS = {
  [CATEGORIA_RECLAMO.PLOMERIA]: 'Plomería',
  [CATEGORIA_RECLAMO.ELECTRICIDAD]: 'Electricidad',
  [CATEGORIA_RECLAMO.GAS]: 'Gas',
  [CATEGORIA_RECLAMO.HUMEDAD]: 'Humedad',
  [CATEGORIA_RECLAMO.ABERTURAS]: 'Aberturas',
  [CATEGORIA_RECLAMO.OTROS]: 'Otros',
};

export const PRIORIDAD_RECLAMO_LABELS = {
  [PRIORIDAD_RECLAMO.BAJA]: 'Baja',
  [PRIORIDAD_RECLAMO.MEDIA]: 'Media',
  [PRIORIDAD_RECLAMO.ALTA]: 'Alta',
};

export const ROL = {
  ADMINISTRADOR: 'administrador',
  ENCARGADO: 'encargado',
  INQUILINO: 'inquilino',
  PROPIETARIO: 'propietario',
};

export const ROL_LABELS = {
  [ROL.ADMINISTRADOR]: 'Administrador',
  [ROL.ENCARGADO]: 'Encargado',
  [ROL.INQUILINO]: 'Inquilino',
  [ROL.PROPIETARIO]: 'Propietario',
};

export function rutaDeRol(rol) {
  if (rol === ROL.ADMINISTRADOR) return '/admin';
  if (rol === ROL.INQUILINO) return '/portal/inquilino';
  if (rol === ROL.PROPIETARIO) return '/portal/propietario';
  return '/app';
}
