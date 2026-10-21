import { BrandLogo } from "./BrandLogo.jsx";
import { Link } from "react-router";
import { useLanguage } from "../context/language-context.js";

export function LegalLayout({ eyebrow, title, intro, children }) {
  const { t } = useLanguage();

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link className="brand" to="/" aria-label={t("invitation.home")}>
          <BrandLogo />
        </Link>

        <Link className="text-link" to="/">
          {t("legal.back")}
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

        <nav className="legal-links" aria-label={t("legal.label")}>
          <Link to="/impressum">Impressum</Link>
          <Link to="/datenschutz">Datenschutz</Link>
        </nav>
      </footer>
    </div>
  );
}
