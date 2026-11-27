import { Encabezado } from '../../../shared/components/Encabezado';
import '../../../shared/styles/detalle.css';
import '../portal.css';

// Encabezado y estados de carga comunes a las pantallas de los portales.
export function PortalMarco({ icono, titulo, subtitulo, accion, loading, error, datos, children }) {
  let contenido;
  if (loading) contenido = <div className="page-loading">Cargando...</div>;
  else if (error) contenido = <div className="page-error">Error: {error}</div>;
  else if (!datos?.persona) {
    contenido = (
      <div className="page-empty">
        <p>Tu cuenta todavía no está vinculada. Pedile a la inmobiliaria que la habilite.</p>
      </div>
    );
  } else contenido = children(datos);

  return (
    <div className="ls-pagina portal">
      <Encabezado icono={icono} titulo={titulo} subtitulo={subtitulo}>
        {accion}
      </Encabezado>
      {contenido}
    </div>
  );
}
