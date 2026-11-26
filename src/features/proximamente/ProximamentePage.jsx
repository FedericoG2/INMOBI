export function ProximamentePage({ titulo, texto }) {
  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{titulo}</h1>
          <p className="page-subtitle">{texto}</p>
        </div>
      </header>
      <div className="empty-state">
        <p>{texto}</p>
      </div>
    </section>
  );
}
