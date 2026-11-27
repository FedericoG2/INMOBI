import { supabase } from '../lib/supabase';
import { sincronizarContratos } from './activacionContratos';
import { indicesService } from './indicesService';
import { TIPO_AJUSTE } from '../constants/estados';
import {
  completarValoresIPC,
  fechaBaseDe,
  mesesEntre,
  montoConFactor,
  montoConProporcion,
  rangoMesesIPC,
  valorICL,
} from './calculoAumento';
import { generarComprobanteAumentoPdf } from './comprobanteAumentoPdf';

export const aumentosService = {
  /**
   * Listar aumentos del período con contratos, inquilinos, propiedades y propietarios
   */
  // onBase recibe la lista apenas llega de la base, antes de calcular los montos.
  async listar({ anio, mes, estado, onBase } = {}) {
    // Primero los contratos: uno vencido no tiene que generar aumentos.
    await sincronizarContratos();
    const { error: syncError } = await supabase.rpc('sincronizar_aumentos_pendientes');
    if (syncError) throw new Error(syncError.message);

    let query = supabase
      .from('aumentos')
      .select(`
        *,
        contratos (
          id,
          estado,
          fecha_inicio,
          monto_actual,
          tipo_ajuste,
          periodicidad_ajuste,
          dia_vencimiento_pago,
          inquilino_id,
          propiedad_id,
          inquilinos (
            id,
            tipo_persona,
            documento,
            nombre,
            apellido,
            razon_social
          ),
          propiedades (
            id,
            codigo,
            calle,
            numero,
            piso,
            departamento,
            localidad,
            propietario_id,
            propietarios (
              id,
              tipo_persona,
              nombre,
              apellido,
              razon_social
            )
          )
        )
      `)
      .order('fecha_aumento', { ascending: true });

    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const visibles = (data || []).filter((aumento) => {
      const delPeriodo = (!anio || aumento.aumento_anio === anio) && (!mes || aumento.aumento_mes === mes);
      return delPeriodo || this.esRezagado(aumento);
    });

    onBase?.(visibles.map((aumento) => {
      const confirmado = aumento.estado === 'confirmado';
      const monto = confirmado ? aumento.monto_nuevo : aumento.monto_calculado;
      return { ...aumento, monto_propuesto: monto, calculando: !confirmado && !monto };
    }));

    const conBase = await this.adjuntarFechaBase(visibles);
    return this.completarCalculos(conBase);
  },

  async adjuntarFechaBase(aumentos) {
    const contratos = [...new Set(aumentos.map((aumento) => aumento.contrato_id).filter(Boolean))];
    if (contratos.length === 0) return aumentos;

    const { data, error } = await supabase
      .from('aumentos')
      .select('id, contrato_id, fecha_aumento, estado')
      .in('contrato_id', contratos)
      .eq('estado', 'confirmado');

    if (error) throw new Error(error.message);

    return aumentos.map((aumento) => {
      const base = fechaBaseDe(aumento, aumento.contratos, data || []);
      return { ...aumento, fecha_base: base.fecha, origen_base: base.origen };
    });
  },

  async completarCalculos(aumentos) {
    const pendientes = aumentos.filter((aumento) => aumento.estado !== 'confirmado' && !aumento.monto_calculado);
    if (pendientes.length === 0) {
      return aumentos.map((aumento) => ({
        ...aumento,
        monto_propuesto: aumento.estado === 'confirmado' ? aumento.monto_nuevo : aumento.monto_calculado,
      }));
    }

    const pedidoManuales = this.listarIndicesManuales();
    let pedidoIPC = [];
    const ipc = pendientes.filter((aumento) => aumento.contratos?.tipo_ajuste === TIPO_AJUSTE.IPC);
    if (ipc.length > 0) {
      const rangos = ipc.map((aumento) => rangoMesesIPC(aumento.fecha_aumento, aumento.fecha_base || aumento.contratos.fecha_inicio));
      const desde = rangos.reduce((min, rango) => {
        const clave = `${rango.anioDesde}-${String(rango.mesDesde).padStart(2, '0')}`;
        return clave < min ? clave : min;
      }, '9999-12');
      const hasta = rangos.reduce((max, rango) => {
        const clave = `${rango.anioHasta}-${String(rango.mesHasta).padStart(2, '0')}`;
        return clave > max ? clave : max;
      }, '0000-01');
      pedidoIPC = indicesService.obtenerIPC(desde, hasta).catch(() => []);
    }
    const [manuales, indicesIPC] = await Promise.all([pedidoManuales, pedidoIPC]);

    return Promise.all(aumentos.map(async (aumento) => {
      if (aumento.estado === 'confirmado') {
        return { ...aumento, monto_propuesto: aumento.monto_nuevo };
      }
      if (aumento.monto_calculado) {
        return { ...aumento, monto_propuesto: aumento.monto_calculado };
      }
      try {
        const resultado = await this.calcularMonto(aumento, {
          indicesIPC: aumento.contratos?.tipo_ajuste === TIPO_AJUSTE.IPC ? indicesIPC : null,
          manuales,
        });
        return { ...aumento, monto_propuesto: resultado.montoCalculado, calculo_vista: resultado.detalle };
      } catch {
        return { ...aumento, monto_propuesto: null };
      }
    }));
  },

  /**
   * Obtener detalle de un aumento
   */
  async obtener(aumentoId) {
    const { data, error } = await supabase
      .from('aumentos')
      .select(`
        *,
        contratos (
          *,
          inquilinos (*),
          propiedades (
            *,
            propietarios (*)
          )
        )
      `)
      .eq('id', aumentoId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Calcular monto nuevo para un aumento
   */
  async calcularMonto(aumento, { indicesIPC = null, indicesICL = null, manuales = null } = {}) {
    const contrato = aumento.contratos;
    const tipoAjuste = contrato.tipo_ajuste;
    const [indicesManuales, base] = await Promise.all([
      manuales || this.listarIndicesManuales(),
      aumento.fecha_base
        ? { fecha: aumento.fecha_base, origen: aumento.origen_base || 'inicio' }
        : this.obtenerFechaBase(aumento, contrato),
    ]);

    if (tipoAjuste === TIPO_AJUSTE.IPC) {
      return this.calcularMontoIPC(aumento, contrato, indicesIPC, indicesManuales, base);
    }
    if (tipoAjuste === TIPO_AJUSTE.ICL) {
      return this.calcularMontoICL(aumento, contrato, indicesICL, indicesManuales, base);
    }

    throw new Error('Tipo de ajuste no soportado');
  },

  async obtenerFechaBase(aumento, contrato) {
    const { data, error } = await supabase
      .from('aumentos')
      .select('id, contrato_id, fecha_aumento, estado')
      .eq('contrato_id', aumento.contrato_id)
      .eq('estado', 'confirmado')
      .lt('fecha_aumento', aumento.fecha_aumento)
      .order('fecha_aumento', { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);
    return fechaBaseDe(aumento, contrato, data || []);
  },

  /**
   * Calcular monto con IPC
   */
  async calcularMontoIPC(aumento, contrato, indicesIPC, manuales, base) {
    const montoAnterior = parseFloat(aumento.monto_anterior);
    const rango = rangoMesesIPC(aumento.fecha_aumento, base.fecha);
    const desde = `${rango.anioDesde}-${String(rango.mesDesde).padStart(2, '0')}`;
    const hasta = `${rango.anioHasta}-${String(rango.mesHasta).padStart(2, '0')}`;

    let indices = indicesIPC;
    if (!indices) {
      try {
        indices = await indicesService.obtenerIPC(desde, hasta);
      } catch {
        indices = [];
      }
    }

    const meses = completarValoresIPC(mesesEntre(rango), indices, manuales).map((mes) => ({
      ...mes,
      etiqueta: `${etiquetaMes(mes.mes)} ${mes.anio}`,
    }));
    const faltantes = meses.filter((mes) => mes.valor == null);

    if (faltantes.length > 0) {
      return {
        montoCalculado: null,
        detalle: {
          tipo: 'ipc',
          fechaBase: base.fecha,
          origenBase: base.origen,
          meses,
          valores: meses.map((mes) => mes.valor),
          origenes: meses.map((mes) => mes.origen),
          faltantes,
        },
      };
    }

    const { factor, montoCalculado } = montoConFactor(montoAnterior, meses.map((mes) => mes.valor));
    return {
      montoCalculado,
      detalle: {
        tipo: 'ipc',
        fechaBase: base.fecha,
        origenBase: base.origen,
        meses,
        valores: meses.map((mes) => mes.valor),
        origenes: meses.map((mes) => mes.origen),
        factor,
      },
    };
  },

  /**
   * Calcular monto con ICL
   */
  async calcularMontoICL(aumento, contrato, indicesICL, manuales, base) {
    const montoAnterior = parseFloat(aumento.monto_anterior);
    const fechaInicio = base.fecha;
    const fechaFin = aumento.fecha_aumento;

    let indices = indicesICL;
    if (!indices) {
      try {
        indices = await indicesService.obtenerICL(fechaInicio, fechaFin);
      } catch {
        indices = [];
      }
    }

    const inicio = valorICL(fechaInicio, indices, manuales);
    const fin = valorICL(fechaFin, indices, manuales);
    const faltantes = [
      ...(inicio.valor == null ? [fechaInicio] : []),
      ...(fin.valor == null ? [fechaFin] : []),
    ];

    if (faltantes.length > 0) {
      return {
        montoCalculado: null,
        detalle: {
          tipo: 'icl',
          fechaBase: base.fecha,
          origenBase: base.origen,
          fechaInicio,
          fechaFin,
          valorInicio: inicio.valor,
          valorFin: fin.valor,
          origenInicio: inicio.origen,
          origenFin: fin.origen,
          faltantes,
        },
      };
    }

    const { factor, montoCalculado } = montoConProporcion(montoAnterior, inicio.valor, fin.valor);
    return {
      montoCalculado,
      detalle: {
        tipo: 'icl',
        fechaBase: base.fecha,
        origenBase: base.origen,
        fechaInicio,
        fechaFin,
        valorInicio: inicio.valor,
        valorFin: fin.valor,
        origenInicio: inicio.origen,
        origenFin: fin.origen,
        factor,
      },
    };
  },

  /**
   * Actualizar monto calculado y observaciones
   */
  async actualizar(aumentoId, { monto_calculado, observaciones }) {
    const actualizacion = {};
    if (monto_calculado !== undefined) actualizacion.monto_calculado = monto_calculado;
    if (observaciones !== undefined) actualizacion.observaciones = observaciones;

    const { error } = await supabase
      .from('aumentos')
      .update(actualizacion)
      .eq('id', aumentoId);

    if (error) throw new Error(error.message);
  },

  /**
   * Confirmar un aumento
   */
  async confirmar(aumentoId, montoNuevo, calculoDetalle, rutaComprobante) {
    const { error } = await supabase.rpc('confirmar_aumento', {
      p_aumento_id: aumentoId,
      p_monto_nuevo: montoNuevo,
      p_calculo_detalle: calculoDetalle,
      p_ruta_comprobante: rutaComprobante,
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Deshacer un aumento
   */
  async deshacer(aumentoId) {
    const actual = await this.obtener(aumentoId);
    const { error } = await supabase.rpc('deshacer_aumento', {
      p_aumento_id: aumentoId,
    });

    if (error) throw new Error(error.message);
    if (actual.ruta_comprobante) {
      // Sin await: limpiar el PDF anterior no tiene por que demorar la pantalla.
      supabase.storage.from('comprobantes-aumentos').remove([actual.ruta_comprobante]).catch(() => {});
    }
  },

  async confirmarConComprobante(aumento, { montoNuevo, detalle, montoCalculado, observaciones } = {}) {
    let calculoDetalle = detalle;
    let calculado = montoCalculado;
    if (!calculoDetalle || calculado == null) {
      const resultado = await this.calcularMonto(aumento);
      if (!resultado.montoCalculado) throw new Error('Faltan índices para confirmar el aumento');
      calculoDetalle = resultado.detalle;
      calculado = resultado.montoCalculado;
    }

    const nuevo = Number(montoNuevo || aumento.monto_calculado || calculado);
    if (!Number.isFinite(nuevo) || nuevo <= 0) throw new Error('Falta el monto nuevo del aumento');

    const contrato = aumento.contratos;
    const pdf = generarComprobanteAumentoPdf({
      periodo: etiquetaPeriodoAumento(aumento),
      inquilino: nombreInquilino(contrato?.inquilinos),
      inmueble: direccionPropiedad(contrato?.propiedades),
      propietario: nombrePropietario(contrato?.propiedades?.propietarios),
      tipoAjuste: (contrato?.tipo_ajuste || '').toUpperCase(),
      fechaBase: calculoDetalle.fechaBase || aumento.fecha_base || contrato?.fecha_inicio,
      origenBase: calculoDetalle.origenBase || aumento.origen_base,
      montoAnterior: formatearMonto(aumento.monto_anterior),
      detalle: calculoDetalle,
      montoCalculado: formatearMonto(calculado),
      montoNuevo: formatearMonto(nuevo),
      montoAnteriorValor: Number(aumento.monto_anterior),
      montoNuevoValor: nuevo,
      observaciones: observaciones || aumento.observaciones,
    });

    const ruta = `${aumento.id}/comprobante-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('comprobantes-aumentos')
      .upload(ruta, pdf, { contentType: 'application/pdf', upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    try {
      await this.confirmar(aumento.id, nuevo, { ...calculoDetalle, montoCalculado: calculado, montoNuevo: nuevo }, ruta);
    } catch (error) {
      await supabase.storage.from('comprobantes-aumentos').remove([ruta]);
      throw error;
    }
  },

  async descargarComprobante(rutaStorage) {
    const { data, error } = await supabase.storage
      .from('comprobantes-aumentos')
      .download(rutaStorage);

    if (error) throw new Error(error.message);
    return data;
  },

  async listarIndicesManuales() {
    const { data, error } = await supabase
      .from('indices_manuales')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .order('fecha', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async guardarIndiceManual({ tipo, anio, mes, fecha, valor }) {
    const numero = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(numero)) throw new Error('El valor del índice no es válido');
    if (numero < 0) throw new Error('El valor del índice no puede ser negativo');
    if (tipo === 'icl' && numero <= 0) throw new Error('El ICL tiene que ser mayor a cero');

    let consulta = supabase.from('indices_manuales').select('id').eq('tipo', tipo);
    if (tipo === 'ipc') consulta = consulta.eq('anio', anio).eq('mes', mes);
    else consulta = consulta.eq('fecha', fecha);

    const { data: existente, error: errorBusqueda } = await consulta.maybeSingle();
    if (errorBusqueda) throw new Error(errorBusqueda.message);

    if (existente) {
      const { error } = await supabase.from('indices_manuales').update({ valor: numero }).eq('id', existente.id);
      if (error) throw new Error(error.message);
      return;
    }

    const fila = tipo === 'ipc'
      ? { tipo, anio, mes, valor: numero }
      : { tipo, fecha, valor: numero };
    const { error } = await supabase.from('indices_manuales').insert(fila);
    if (error) throw new Error(error.message);
  },

  /**
   * Verificar si un aumento puede deshacerse
   */
  puedeDeshacer(aumento) {
    if (aumento.estado !== 'confirmado') return false;
    if (!aumento.confirmado_en) return false;

    // Hasta el día 10 del mes siguiente
    const fechaAumento = new Date(aumento.fecha_aumento + 'T00:00:00');
    const mesSiguiente = new Date(fechaAumento);
    mesSiguiente.setMonth(mesSiguiente.getMonth() + 1);
    mesSiguiente.setDate(10);
    mesSiguiente.setHours(23, 59, 59, 999);

    const ahora = new Date();
    return ahora <= mesSiguiente;
  },

  /**
   * Determinar el período de trabajo según el día actual
   * Del 1 al 10: mes anterior
   * Del 11 en adelante: mes actual
   */
  obtenerPeriodoTrabajo() {
    const ahora = new Date();
    const dia = ahora.getDate();
    
    if (dia <= 10) {
      // Mes anterior
      const mesAnterior = new Date(ahora);
      mesAnterior.setMonth(mesAnterior.getMonth() - 1);
      return {
        anio: mesAnterior.getFullYear(),
        mes: mesAnterior.getMonth() + 1,
      };
    } else {
      // Mes actual
      return {
        anio: ahora.getFullYear(),
        mes: ahora.getMonth() + 1,
      };
    }
  },

  /**
   * Verificar si un aumento está rezagado
   */
  esRezagado(aumento) {
    if (aumento.estado === 'confirmado') return false;

    const fechaAumento = new Date(aumento.fecha_aumento + 'T00:00:00');
    const mesSiguiente = new Date(fechaAumento);
    mesSiguiente.setMonth(mesSiguiente.getMonth() + 1);
    mesSiguiente.setDate(10);
    mesSiguiente.setHours(23, 59, 59, 999);

    const ahora = new Date();
    return ahora > mesSiguiente;
  },
};

// Helpers de formato
export function etiquetaMes(mes) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || '';
}

export function etiquetaPeriodoAumento(aumento) {
  return `${etiquetaMes(aumento.aumento_mes)} ${aumento.aumento_anio}`;
}

export function formatearMonto(monto) {
  if (monto == null) return '-';
  return `$ ${parseFloat(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function nombreInquilino(inquilino) {
  if (!inquilino) return 'Sin inquilino';
  if (inquilino.tipo_persona === 'juridica') return inquilino.razon_social || 'Sin razón social';
  return `${inquilino.nombre || ''} ${inquilino.apellido || ''}`.trim() || 'Sin nombre';
}

export function direccionPropiedad(propiedad) {
  if (!propiedad) return 'Sin propiedad';
  const unidad = [propiedad.piso && `Piso ${propiedad.piso}`, propiedad.departamento && `Depto ${propiedad.departamento}`]
    .filter(Boolean)
    .join(', ');
  const linea1 = `${propiedad.calle} ${propiedad.numero}${unidad ? ` (${unidad})` : ''}`;
  return `${linea1}, ${propiedad.localidad}`;
}

export function nombrePropietario(propietario) {
  if (!propietario) return 'Sin propietario';
  if (propietario.tipo_persona === 'juridica') return propietario.razon_social || 'Sin razón social';
  return `${propietario.nombre || ''} ${propietario.apellido || ''}`.trim() || 'Sin nombre';
}
