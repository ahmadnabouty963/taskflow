import { Link } from "react-router";
import { BrandLogo } from "../components/BrandLogo.jsx";
import { useAuth } from "../context/auth-context.js";
import { useLanguage } from "../context/language-context.js";

const featureKeys = ["workspaces", "tasks", "calendar", "details", "recurring", "account"];
const workflowKeys = ["one", "two", "three"];

export function LandingPage() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="marketing-page marketing-page--expanded">
      <header className="site-header">
        <Link aria-label="Ordanly home" className="brand" to="/">
          <BrandLogo />
        </Link>

        <nav aria-label="Main navigation" className="marketing-navigation">
          <a href="#features">{t("landing.nav.features")}</a>
          <a href="#workflow">{t("landing.nav.workflow")}</a>
        </nav>

        <nav aria-label="Account navigation" className="header-actions">
          {!isLoading && user ? (
            <Link className="button button--dark" to="/app">{t("common.openWorkspace")}</Link>
          ) : (
            <>
              <Link className="text-link" to="/login">{t("common.login")}</Link>
              <Link className="button button--dark" to="/register">{t("common.register")}</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero-section hero-section--expanded">
          <div className="hero-copy">
            <p className="eyebrow">{t("landing.eyebrow")}</p>
            <h1>{t("landing.title")}</h1>
            <p className="hero-description">{t("landing.description")}</p>
            <div className="hero-actions">
              <Link className="button button--dark button--large" to="/register">{t("landing.primary")}</Link>
              <a className="button button--ghost button--large" href="#features">{t("landing.secondary")}</a>
            </div>
            <ul className="landing-proof-list">
              <li>{t("landing.proof.workspaces")}</li>
              <li>{t("landing.proof.roles")}</li>
              <li>{t("landing.proof.security")}</li>
            </ul>
          </div>

          <div aria-label="Ordanly task preview" className="product-preview product-preview--detailed">
            <div className="preview-toolbar">
              <img alt="" aria-hidden="true" className="preview-logo preview-logo--image" src="/ordanly-app-icon.svg" />
              <span>{t("landing.preview.project")}</span>
              <span className="preview-count">{t("landing.preview.count")}</span>
            </div>
            <div className="preview-board">
              <article><p>{t("landing.preview.todo")}</p><div className="preview-task"><span className="task-label task-label--blue">{t("landing.preview.research")}</span><strong>{t("landing.preview.interviews")}</strong><small>{t("landing.preview.tomorrow")}</small></div></article>
              <article><p>{t("landing.preview.progress")}</p><div className="preview-task preview-task--active"><span className="task-label task-label--orange">{t("landing.preview.design")}</span><strong>{t("landing.preview.page")}</strong><small>{t("landing.preview.percent")}</small></div></article>
              <article><p>{t("landing.preview.done")}</p><div className="preview-task"><span className="task-label task-label--green">{t("landing.preview.planning")}</span><strong>{t("landing.preview.milestones")}</strong><small>{t("landing.preview.completed")}</small></div></article>
            </div>
          </div>
        </section>

        <section className="landing-feature-section" id="features">
          <header className="landing-section-heading">
            <p className="eyebrow">{t("landing.features.eyebrow")}</p>
            <h2>{t("landing.features.title")}</h2>
            <p>{t("landing.features.intro")}</p>
          </header>
          <div className="landing-feature-grid">
            {featureKeys.map((feature, index) => (
              <article key={feature}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{t(`landing.feature.${feature}.title`)}</h3>
                <p>{t(`landing.feature.${feature}.copy`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-calendar-section">
          <div className="landing-calendar-copy">
            <p className="eyebrow">{t("landing.calendar.eyebrow")}</p>
            <h2>{t("landing.calendar.title")}</h2>
            <p>{t("landing.calendar.copy")}</p>
            <Link className="text-link landing-inline-link" to="/register">{t("landing.primary")}</Link>
          </div>
          <div aria-label="Calendar feature preview" className="landing-calendar-preview">
            <header><strong>{t("landing.calendar.month")}</strong><span>{t("landing.calendar.today")}</span></header>
            <div className="landing-calendar-grid">
              {[19, 20, 21, 22, 23, 24, 25].map((day) => (
                <div className={day === 21 ? "is-today" : ""} key={day}>
                  <time>{day}</time>
                  {day === 21 ? <span className="calendar-preview-entry calendar-preview-entry--task"><small>{t("landing.calendar.task")}</small>{t("landing.calendar.taskExample")}</span> : null}
                  {day === 23 ? <span className="calendar-preview-entry calendar-preview-entry--event"><small>{t("landing.calendar.event")}</small>{t("landing.calendar.eventExample")}</span> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="workflow-section workflow-section--expanded" id="workflow">
          <div><p className="eyebrow">{t("landing.workflow.eyebrow")}</p><h2>{t("landing.workflow.title")}</h2></div>
          <ol className="workflow-list">
            {workflowKeys.map((step, index) => (
              <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{t(`landing.workflow.${step}.title`)}</h3><p>{t(`landing.workflow.${step}.copy`)}</p></div></li>
            ))}
          </ol>
        </section>

        <section className="landing-cta-section">
          <p className="eyebrow eyebrow--light">{t("landing.cta.eyebrow")}</p>
          <h2>{t("landing.cta.title")}</h2>
          <p>{t("landing.cta.copy")}</p>
          <Link className="button landing-cta-button" to="/register">{t("landing.cta.button")}</Link>
        </section>
      </main>

      <footer className="site-footer"><span>© 2026 Ordanly</span><nav aria-label="Legal information" className="legal-links"><Link to="/impressum">Impressum</Link><Link to="/datenschutz">Datenschutz</Link></nav></footer>
    </div>
  );
}
