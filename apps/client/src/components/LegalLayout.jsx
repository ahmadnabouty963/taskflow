import { Link } from "react-router";

export function LegalLayout({ eyebrow, title, intro, children }) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link className="brand" to="/" aria-label="Ordanly home">
          <span className="brand-logo">O</span>
          <span>Ordanly</span>
        </Link>

        <Link className="text-link" to="/">
          Back to homepage
        </Link>
      </header>

      <main className="legal-main">
        <p className="eyebrow">{eyebrow}</p>
        <h1
          className={
            title.length > 14
              ? "legal-title legal-title--long"
              : "legal-title"
          }
        >
          {title}
        </h1>
        <p className="legal-intro">{intro}</p>

        <article className="legal-content">{children}</article>
      </main>

      <footer className="site-footer legal-footer">
        <span>© 2026 Ordanly</span>

        <nav className="legal-links" aria-label="Legal information">
          <Link to="/impressum">Impressum</Link>
          <Link to="/datenschutz">Datenschutz</Link>
        </nav>
      </footer>
    </div>
  );
}
