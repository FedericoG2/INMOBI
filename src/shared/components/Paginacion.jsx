import { useState } from 'react';

const REGISTROS_POR_PAGINA = 4;

export function usePaginacion(items, resetKey = '', porPagina = REGISTROS_POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const [clave, setClave] = useState(resetKey);

  if (resetKey !== clave) {
    setClave(resetKey);
    setPagina(1);
  }

  const total = items.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(pagina, paginas);
  const desde = (actual - 1) * porPagina;

  return {
    visibles: items.slice(desde, desde + porPagina),
    pagina: actual,
    paginas,
    total,
    porPagina,
    setPagina,
  };
}

export function Paginacion({ total, pagina, paginas, porPagina, onChange }) {
  if (total <= porPagina) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);

  return (
    <div className="paginacion">
      <span>Mostrando {desde}-{hasta} de {total}</span>
      <div className="paginacion-controles">
        <button type="button" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>Anterior</button>
        <span>Página {pagina} de {paginas}</span>
        <button type="button" disabled={pagina >= paginas} onClick={() => onChange(pagina + 1)}>Siguiente</button>
      </div>
    </div>
  );
}
