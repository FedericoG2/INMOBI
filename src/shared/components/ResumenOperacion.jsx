import { Icon } from './Icons';
import './ResumenOperacion.css';

// Resumen de lo que se está por confirmar: datos, importes y efectos.
export function ResumenOperacion({ datos, montos = [], efectos }) {
  return (
    <div className="rop">
      <dl className="rop-datos">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      {montos.length > 0 && <div className="rop-montos">
        {montos.map((monto, indice) => (
          <div key={monto.etiqueta} className="rop-monto-grupo">
            {indice > 0 && <span className="rop-flecha" aria-hidden="true">→</span>}
            <div className={`rop-monto${monto.destacado ? ' es-destacado' : ''}`}>
              <small>{monto.etiqueta}</small>
              <strong>{monto.valor}</strong>
              {monto.detalle && <span>{monto.detalle}</span>}
            </div>
          </div>
        ))}
      </div>}

      <ul className="rop-efectos">
        {efectos.map((efecto) => (
          <li key={efecto.texto}>
            <span aria-hidden="true"><Icon name={efecto.icono} size={15} /></span>
            {efecto.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
