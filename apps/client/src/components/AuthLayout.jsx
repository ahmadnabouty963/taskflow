import { BrandLogo } from "./BrandLogo.jsx";
import { Link } from "react-router";

export function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="brand brand--light" to="/">
          <BrandLogo />
        </Link>

        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow--light">Work with intention</p>
          <h2>Keep the work clear and the team moving.</h2>
          <p>Projects, tasks and priorities in one calm, focused workspace.</p>
        </div>

        <p className="auth-brand-footer">
          Designed for people who value clarity.
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
