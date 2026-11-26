import { useEffect, useMemo, useRef, useState } from 'react';
import './SelectBuscable.css';

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function SelectBuscable({
  id,
  value,
  onChange,
  opciones,
  placeholder = 'Seleccionar',
  placeholderBusqueda = 'Buscar...',
  textoVacio = 'Sin resultados',
  buscable = true,
  disabled = false,
  error = false,
}) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [activo, setActivo] = useState(0);
  const contenedor = useRef(null);
  const disparador = useRef(null);
  const lista = useRef(null);

  const seleccionada = opciones.find((opcion) => opcion.value === value);

  const filtradas = useMemo(() => {
    const texto = normalizar(consulta).trim();
    if (!texto) return opciones;
    return opciones.filter((opcion) => normalizar(`${opcion.label} ${opcion.sublabel || ''} ${opcion.meta || ''}`).includes(texto));
  }, [opciones, consulta]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alClickearFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClickearFuera);
    return () => document.removeEventListener('mousedown', alClickearFuera);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    lista.current?.querySelector('[data-activa="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [abierto, activo]);

  function abrir() {
    if (disabled) return;
    setConsulta('');
    setActivo(Math.max(0, opciones.findIndex((opcion) => opcion.value === value)));
    setAbierto(true);
  }

  function elegir(opcion) {
    onChange(opcion.value);
    setAbierto(false);
    disparador.current?.focus();
  }

  function alTeclear(evento) {
    if (!abierto) {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault();
        abrir();
      }
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setActivo((actual) => Math.min(actual + 1, filtradas.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setActivo((actual) => Math.max(actual - 1, 0));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      if (filtradas[activo]) elegir(filtradas[activo]);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      setAbierto(false);
      disparador.current?.focus();
    }
  }

  return (
    <div className="selectb" ref={contenedor}>
      <button
        type="button"
        id={id}
        ref={disparador}
        className={`selectb-disparador${abierto ? ' is-open' : ''}${error ? ' has-error' : ''}`}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={buscable ? undefined : alTeclear}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        {seleccionada ? (
          <>
            {seleccionada.icono && <span className="selectb-avatar">{seleccionada.icono}</span>}
            <span className="selectb-texto">
              <strong>{seleccionada.label}</strong>
              {seleccionada.sublabel && <small>{seleccionada.sublabel}</small>}
            </span>
            {seleccionada.meta && <span className="selectb-meta">{seleccionada.meta}</span>}
          </>
        ) : (
          <span className="selectb-placeholder">{placeholder}</span>
        )}
        <svg className="selectb-flecha" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div className="selectb-panel">
          {buscable && (
            <input
              type="text"
              className="selectb-busqueda"
              value={consulta}
              placeholder={placeholderBusqueda}
              onChange={(evento) => {
                setConsulta(evento.target.value);
                setActivo(0);
              }}
              onKeyDown={alTeclear}
              autoFocus
            />
          )}
          <ul className="selectb-lista" role="listbox" ref={lista}>
            {filtradas.length === 0 && <li className="selectb-vacio">{textoVacio}</li>}
            {filtradas.map((opcion, indice) => {
              const esSeleccionada = opcion.value === value;
              return (
                <li
                  key={opcion.value}
                  role="option"
                  aria-selected={esSeleccionada}
                  data-activa={indice === activo}
                  className={`selectb-opcion${indice === activo ? ' is-active' : ''}${esSeleccionada ? ' is-selected' : ''}`}
                  onMouseEnter={() => setActivo(indice)}
                  onClick={() => elegir(opcion)}
                >
                  {opcion.icono && <span className="selectb-avatar">{opcion.icono}</span>}
                  <span className="selectb-texto">
                    <strong>{opcion.label}</strong>
                    {opcion.sublabel && <small>{opcion.sublabel}</small>}
                  </span>
                  {opcion.meta && <span className="selectb-meta">{opcion.meta}</span>}
                  {esSeleccionada && (
                    <svg className="selectb-check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
