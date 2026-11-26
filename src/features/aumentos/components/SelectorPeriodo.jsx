import { useEffect, useRef, useState } from 'react';
import { etiquetaMes } from '../../../services/aumentosService';
import { Icon } from '../../../shared/components/Icons';
import './SelectorPeriodo.css';

const ANIOS_HACIA_ATRAS = 5;
const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

export function SelectorPeriodo({ periodo, vigente, onChange, disabled = false }) {
  const [abierto, setAbierto] = useState(false);
  // Sin período elegido se están viendo todos los meses.
  const [anio, setAnio] = useState((periodo || vigente).anio);
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    function alHacerClic(event) {
      if (!contenedor.current?.contains(event.target)) setAbierto(false);
    }
    function alPresionar(event) {
      if (event.key === 'Escape') setAbierto(false);
    }

    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionar);
    };
  }, [abierto]);

  function alternar() {
    // Al abrir, mostrar el año del período seleccionado.
    setAnio((periodo || vigente).anio);
    setAbierto((actual) => !actual);
  }

  function elegir(nuevo) {
    setAbierto(false);
    onChange(nuevo);
  }

  const esVigente = periodo?.anio === vigente.anio && periodo?.mes === vigente.mes;

  return (
    <div className="selper" ref={contenedor}>
      <button
        type="button"
        className={`selper-boton${abierto ? ' is-abierto' : ''}`}
        onClick={alternar}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={abierto}
      >
        <Icon name="calendar" size={16} />
        <span>Período de trabajo:</span>
        <strong>{periodo ? `${etiquetaMes(periodo.mes)} ${periodo.anio}` : 'Todos los meses'}</strong>
        <span className="selper-flecha" aria-hidden="true" />
      </button>

      {abierto && (
        <div className="selper-panel" role="dialog" aria-label="Elegir período de trabajo">
          <div className="selper-anio">
            <button
              type="button"
              onClick={() => setAnio(anio - 1)}
              disabled={anio <= vigente.anio - ANIOS_HACIA_ATRAS}
              aria-label="Año anterior"
            >
              ‹
            </button>
            <strong>{anio}</strong>
            <button
              type="button"
              onClick={() => setAnio(anio + 1)}
              disabled={anio >= vigente.anio}
              aria-label="Año siguiente"
            >
              ›
            </button>
          </div>

          <div className="selper-meses">
            {MESES.map((mes) => {
              // Solo se puede ir hacia atrás: el tope avanza con el período vigente.
              const futuro = anio > vigente.anio || (anio === vigente.anio && mes > vigente.mes);
              const elegido = anio === periodo?.anio && mes === periodo?.mes;
              const actual = anio === vigente.anio && mes === vigente.mes;
              return (
                <button
                  type="button"
                  key={mes}
                  className={`selper-mes${elegido ? ' is-elegido' : ''}${actual ? ' is-vigente' : ''}`}
                  onClick={() => elegir({ anio, mes })}
                  disabled={futuro}
                  aria-pressed={elegido}
                  title={`${etiquetaMes(mes)} ${anio}${actual ? ' (período vigente)' : ''}`}
                >
                  {etiquetaMes(mes).slice(0, 3)}
                </button>
              );
            })}
          </div>

          {!esVigente && (
            <button type="button" className="selper-volver" onClick={() => elegir(vigente)}>
              Volver al período vigente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
