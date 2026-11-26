import { Icon } from './Icons';
import '../styles/listado.css';

export function Encabezado({ icono, titulo, subtitulo, children }) {
  return (
    <header className="page-header">
      <div className="ls-encabezado">
        <span className="ls-icono"><Icon name={icono} size={24} /></span>
        <div>
          <h1>{titulo}</h1>
          <p className="page-subtitle">{subtitulo}</p>
        </div>
      </div>
      {children}
    </header>
  );
}
