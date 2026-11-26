import '../styles/detalle.css';

export function Tarjeta({ titulo, icono, contador = null, accion = null, className = '', children }) {
  return (
    <section className={`cd-tarjeta ${className}`.trim()}>
      <header className="cd-tarjeta-encabezado">
        <div className="cd-tarjeta-titulo">
          {icono && <span className="cd-icono">{icono}</span>}
          <h3>{titulo}</h3>
          {contador != null && <span className="cd-contador">{contador}</span>}
        </div>
        {accion}
      </header>
      {children}
    </section>
  );
}

export function Dato({ etiqueta, children, ancho = false, destacado = false }) {
  return (
    <div className={`cd-dato${ancho ? ' cd-ancho' : ''}${destacado ? ' cd-destacado' : ''}`}>
      <dt>{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}
