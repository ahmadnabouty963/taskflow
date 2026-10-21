import { BrandLogo } from "./BrandLogo.jsx";
import { Link } from "react-router";
import { useLanguage } from "../context/language-context.js";

export function AuthLayout({ eyebrow, title, description, children, footer }) {
  const { t } = useLanguage();

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="brand brand--light" to="/">
          <BrandLogo />
        </Link>

        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow--light">{t("auth.panel.eyebrow")}</p>
          <h2>{t("auth.panel.title")}</h2>
          <p>{t("auth.panel.copy")}</p>
        </div>

        <p className="auth-brand-footer">
          {t("auth.panel.footer")}
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>

          {children}

          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}
