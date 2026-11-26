import { useRef, useState } from 'react';
import './SubirArchivos.css';

function formatearTamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function extension(nombre) {
  const partes = nombre.split('.');
  return partes.length > 1 ? partes.pop().slice(0, 4).toUpperCase() : 'ARCH';
}

const claveDe = (archivo) => `${archivo.name}-${archivo.size}-${archivo.lastModified}`;

export function SubirArchivos({ id, value = [], onChange, multiple = false, max = 3, mostrarContador = true, accept, disabled = false }) {
  const input = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState('');

  const limite = multiple ? max : 1;
  const mostrarZona = value.length < limite;

  function agregar(lista) {
    const nuevos = Array.from(lista || []);
    if (nuevos.length === 0) return;

    if (!multiple) {
      onChange(nuevos.slice(0, 1));
      setAviso(nuevos.length > 1 ? 'Solo se puede adjuntar un archivo.' : '');
      return;
    }

    const existentes = new Set(value.map(claveDe));
    const unicos = nuevos.filter((archivo) => !existentes.has(claveDe(archivo)));
    const aceptados = unicos.slice(0, Math.max(limite - value.length, 0));
    setAviso(unicos.length > aceptados.length ? `Solo se pueden adjuntar hasta ${limite} archivos.` : '');
    if (aceptados.length > 0) onChange([...value, ...aceptados]);
  }

  function quitar(indice) {
    setAviso('');
    onChange(value.filter((_, posicion) => posicion !== indice));
  }

  function elegir() {
    if (!disabled) input.current?.click();
  }

  return (
    <div className="subir">
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={(evento) => {
          agregar(evento.target.files);
          evento.target.value = '';
        }}
      />

      {mostrarZona && (
        <button
          type="button"
          id={id}
          className={`subir-zona${arrastrando ? ' is-drag' : ''}`}
          onClick={elegir}
          disabled={disabled}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setArrastrando(false);
            if (!disabled) agregar(evento.dataTransfer.files);
          }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <span>
            <strong>{multiple ? 'Elegí archivos' : 'Elegí un archivo'}</strong> o arrastralo acá
          </span>
        </button>
      )}

      {value.length > 0 && (
        <ul className="subir-lista">
          {value.map((archivo, indice) => {
            const ext = extension(archivo.name);
            return (
              <li key={claveDe(archivo)} className="subir-archivo">
                <span className={`subir-ext${ext === 'PDF' ? ' es-pdf' : ''}`}>{ext}</span>
                <span className="subir-info">
                  <strong title={archivo.name}>{archivo.name}</strong>
                  <small>{formatearTamano(archivo.size)}</small>
                </span>
                {!multiple && (
                  <button type="button" id={mostrarZona ? undefined : id} className="subir-cambiar" onClick={elegir} disabled={disabled}>
                    Cambiar
                  </button>
                )}
                <button
                  type="button"
                  className="subir-quitar"
                  aria-label={`Quitar ${archivo.name}`}
                  onClick={() => quitar(indice)}
                  disabled={disabled}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {multiple && mostrarContador && (
        <p className={`subir-contador${value.length >= limite ? ' is-lleno' : ''}`}>
          {value.length} de {limite} archivos
          {value.length >= limite && ' · quitá uno para adjuntar otro'}
        </p>
      )}
      {aviso && <p className="subir-aviso">{aviso}</p>}
    </div>
  );
}
