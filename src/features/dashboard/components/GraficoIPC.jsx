import { useState } from 'react';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const porcentaje = (valor) => `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`;

// Columnas de una sola serie: la altura parte de cero y se rotulan solo el mayor y el último.
export function GraficoIPC({ serie }) {
  const [verTabla, setVerTabla] = useState(false);
  const valores = serie.map((item) => Number(item.valor));
  const tope = Math.max(1, Math.ceil(Math.max(...valores)));
  const indiceMayor = valores.indexOf(Math.max(...valores));
  const marcas = [tope, tope / 2, 0];

  return (
    <div className="db-ipc">
      <button type="button" className="db-ipc-alternar" onClick={() => setVerTabla((actual) => !actual)}>
        {verTabla ? 'Ver gráfico' : 'Ver tabla'}
      </button>

      {verTabla ? (
        <div className="cd-tabla-contenedor">
          <table className="cd-tabla">
            <thead>
              <tr><th>Mes</th><th className="cd-num">Variación mensual</th></tr>
            </thead>
            <tbody>
              {serie.map((item) => (
                <tr key={`${item.anio}-${item.mes}`}>
                  <td>{MESES[item.mes - 1]} {item.anio}</td>
                  <td className="cd-num">{porcentaje(item.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="db-grafico">
          <div className="db-eje" aria-hidden="true">
            {marcas.map((marca) => <span key={marca}>{porcentaje(marca)}</span>)}
          </div>
          <div className="db-trazado">
            <div className="db-grilla" aria-hidden="true">
              {marcas.map((marca) => <span key={marca} />)}
            </div>
            <ul className="db-columnas">
              {serie.map((item, indice) => {
                const nombre = `${MESES[item.mes - 1]} ${item.anio}`;
                const destacado = indice === serie.length - 1 || indice === indiceMayor;
                return (
                  <li key={`${item.anio}-${item.mes}`} tabIndex={0} aria-label={`${nombre}: ${porcentaje(item.valor)}`}>
                    <div className="db-columna" style={{ height: `${(Math.max(Number(item.valor), 0) / tope) * 100}%` }}>
                      {destacado && <span className="db-valor">{porcentaje(item.valor)}</span>}
                      <span className="db-globo" role="tooltip">
                        <strong>{porcentaje(item.valor)}</strong>
                        {nombre}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="db-meses" aria-hidden="true">
            {serie.map((item) => (
              <span key={`${item.anio}-${item.mes}`}>
                {MESES[item.mes - 1]}
                <small>{String(item.anio).slice(2)}</small>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
