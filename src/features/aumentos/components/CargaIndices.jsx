import { useState } from 'react';
import { aumentosService, etiquetaMes } from '../../../services/aumentosService';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Icon } from '../../../shared/components/Icons';
import { useToast } from '../../../shared/components/Toast';
import { soloDecimal } from '../../../shared/validaciones';
import './CargaIndices.css';

const GRUPOS = [
  { tipo: 'ipc', titulo: 'IPC · variación mensual (%)', ejemplo: 'Ej: 2.1' },
  { tipo: 'icl', titulo: 'ICL · valor del día', ejemplo: 'Ej: 34.24' },
];

function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

// Índices que usan los aumentos sin confirmar y que la API no está entregando:
// los que faltan y los que ya se cargaron a mano (para poder corregirlos).
function indicesNecesarios(aumentos) {
  const indices = new Map();

  aumentos.forEach((aumento) => {
    const detalle = aumento.calculo_vista;
    if (!detalle) return;

    // Si varios contratos usan el mismo índice, se pide una sola vez.
    const sumar = (indice) => indices.set(indice.clave, indice);

    if (detalle.tipo === 'ipc') {
      (detalle.meses || [])
        .filter((mes) => mes.valor == null || mes.origen === 'manual')
        .forEach((mes) => sumar({
          clave: `ipc-${mes.anio}-${String(mes.mes).padStart(2, '0')}`,
          tipo: 'ipc',
          anio: mes.anio,
          mes: mes.mes,
          etiqueta: `${etiquetaMes(mes.mes)} ${mes.anio}`,
          cargado: mes.valor,
        }));
      return;
    }

    [
      { fecha: detalle.fechaInicio, valor: detalle.valorInicio, origen: detalle.origenInicio },
      { fecha: detalle.fechaFin, valor: detalle.valorFin, origen: detalle.origenFin },
    ]
      .filter((punto) => punto.fecha && (punto.valor == null || punto.origen === 'manual'))
      .forEach((punto) => sumar({
        clave: `icl-${punto.fecha}`,
        tipo: 'icl',
        fecha: punto.fecha,
        etiqueta: formatearFecha(punto.fecha),
        cargado: punto.valor,
      }));
  });

  return [...indices.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

// Aviso para valores que suelen ser un error de tipeo; no impide guardar.
function advertencia(indice, valor) {
  if (indice.tipo !== 'ipc' || valor === '' || valor === undefined) return null;
  const numero = Number(valor);
  return numero > 15 ? 'Revisá el valor: es raro para un solo mes.' : null;
}

export function CargaIndices({ aumentos, calculando, periodoTexto, onGuardado, onCerrar }) {
  const [valores, setValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const toast = useToast();

  const indices = indicesNecesarios(aumentos);
  const faltantes = indices.filter((indice) => indice.cargado == null);
  // Solo se guarda lo que se escribió y es distinto de lo que ya estaba.
  const nuevos = indices.filter((indice) => {
    const valor = valores[indice.clave];
    return valor !== undefined && valor !== '' && valor !== '.' && Number(valor) !== indice.cargado;
  });

  const quedanFaltantes = faltantes.some((falta) => !nuevos.some((nuevo) => nuevo.clave === falta.clave));

  // Antes de guardar se avisa que los montos se calculan solos.
  function handleSubmit(event) {
    event.preventDefault();
    setConfirmar(true);
  }

  async function guardar() {
    setGuardando(true);
    let guardados = 0;
    try {
      for (const indice of nuevos) {
        await aumentosService.guardarIndiceManual({
          tipo: indice.tipo,
          anio: indice.anio,
          mes: indice.mes,
          fecha: indice.fecha,
          valor: valores[indice.clave],
        });
        guardados += 1;
      }
      toast.success(quedanFaltantes
        ? `${guardados === 1 ? 'Índice guardado' : `${guardados} índices guardados`}. Todavía quedan por cargar.`
        : 'Índices guardados. Los aumentos se calculan automáticamente.');
      setValores({});
      onGuardado(!quedanFaltantes);
    } catch (err) {
      toast.error(err.message);
      if (guardados > 0) onGuardado(false);
    } finally {
      setConfirmar(false);
      setGuardando(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="au-ci">
      {calculando ? (
        <p className="au-ci-vacio">Revisando qué índices hacen falta...</p>
      ) : indices.length === 0 ? (
        <p className="au-ci-vacio">No hay índices pendientes de carga en {periodoTexto}.</p>
      ) : (
        <>
          <p className="au-ci-intro">
            Te guiamos en la carga de índices para calcular los aumentos de los contratos que quedaron pendientes.
          </p>

          {GRUPOS.map((grupo) => {
            const delGrupo = indices.filter((indice) => indice.tipo === grupo.tipo);
            if (delGrupo.length === 0) return null;
            return (
              <fieldset className="au-ci-grupo" key={grupo.tipo}>
                <legend>{grupo.titulo}</legend>
                {delGrupo.map((indice) => {
                  const escrito = valores[indice.clave];
                  const valor = escrito ?? (indice.cargado ?? '');
                  const aviso = advertencia(indice, escrito);
                  return (
                    <div className="au-ci-fila" key={indice.clave}>
                      <label htmlFor={indice.clave}>
                        <strong>{indice.etiqueta}</strong>
                      </label>
                      <input
                        id={indice.clave}
                        inputMode="decimal"
                        autoComplete="off"
                        value={valor}
                        placeholder={grupo.ejemplo}
                        disabled={guardando}
                        onChange={(event) => setValores((actual) => ({
                          ...actual,
                          [indice.clave]: soloDecimal(event.target.value),
                        }))}
                      />
                      <span className={`au-ci-estado${indice.cargado != null ? ' es-cargado' : ''}`}>
                        {indice.cargado != null ? 'Cargado' : 'Falta'}
                      </span>
                      {aviso && (
                        <p className="au-ci-aviso">
                          <Icon name="alert" size={14} />
                          {aviso}
                        </p>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            );
          })}
        </>
      )}

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCerrar} disabled={guardando}>
          {indices.length === 0 && !calculando ? 'Cerrar' : 'Cancelar'}
        </Button>
        {indices.length > 0 && !calculando && (
          <Button type="submit" variant="success" disabled={guardando || nuevos.length === 0}>
            {guardando ? 'Guardando...' : 'Guardar índices'}
          </Button>
        )}
      </div>
    </form>

    <ConfirmDialog
      isOpen={confirmar}
      title="Guardar Índices"
      message="Al guardar los índices se van a calcular automáticamente los aumentos que quedaron pendientes."
      warning={quedanFaltantes ? 'Todavía faltan índices: los aumentos que los necesiten quedan sin calcular.' : undefined}
      confirmLabel="Guardar y calcular"
      cancelLabel="Volver"
      variant="success"
      busy={guardando}
      onConfirm={guardar}
      onCancel={() => setConfirmar(false)}
    />
    </>
  );
}
