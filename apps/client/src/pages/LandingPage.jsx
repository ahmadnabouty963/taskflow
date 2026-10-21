import { BrandLogo } from "../components/BrandLogo.jsx";
import { Link } from "react-router";
import { useAuth } from "../context/auth-context.js";

export function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="marketing-page">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Ordanly home">
          <BrandLogo />
        </Link>

        <nav className="header-actions" aria-label="Main navigation">
          {!isLoading && user ? (
            <Link className="button button--dark" to="/app">
              Open workspace
            </Link>
          ) : (
            <>
              <Link className="text-link" to="/login">
                Log in
              </Link>
              <Link className="button button--dark" to="/register">
                Start free
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Built for focused teams</p>

            <h1>
              Make the next step <span> unmistakably clear.</span>
            </h1>

            <p className="hero-description">
              Plan projects, organize tasks and keep priorities visible without
              adding another complicated tool to your day.
            </p>

            <div className="hero-actions">
              <Link
                className="button button--dark button--large"
                to="/register"
              >
                Create your workspace
              </Link>
              <a
                className="button button--ghost button--large"
                href="#workflow"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="product-preview" aria-label="Ordanly task preview">
            <div className="preview-toolbar">
              <img alt="" aria-hidden="true" className="preview-logo preview-logo--image" src="/ordanly-app-icon.svg" />
              <span>Website launch</span>
              <span className="preview-count">6 tasks</span>
            </div>

            <div className="preview-board">
              <article>
                <p>To do</p>
                <div className="preview-task">
                  <span className="task-label task-label--blue">Research</span>
                  <strong>Review customer interviews</strong>
                  <small>Due tomorrow</small>
                </div>
              </article>

              <article>
                <p>In progress</p>
                <div className="preview-task preview-task--active">
                  <span className="task-label task-label--orange">Design</span>
                  <strong>Build the new landing page</strong>
                  <small>68% complete</small>
                </div>
              </article>

              <article>
                <p>Done</p>
                <div className="preview-task">
                  <span className="task-label task-label--green">Planning</span>
                  <strong>Define project milestones</strong>
                  <small>Completed</small>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="workflow-section" id="workflow">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>From idea to done in three clear steps.</h2>
          </div>

          <ol className="workflow-list">
            <li>
              <span>01</span>
              <div>
                <h3>Create a project</h3>
                <p>Give the work a clear goal and a place to live.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Break it into tasks</h3>
                <p>Set status, priority and deadlines for every task.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Keep progress visible</h3>
                <p>Find blockers early and know what needs attention next.</p>
              </div>
            </li>
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <span>© 2026 Ordanly</span>

        <nav className="legal-links" aria-label="Legal information">
          <Link to="/impressum">Impressum</Link>
          <Link to="/datenschutz">Datenschutz</Link>
        </nav>
      </footer>
    </div>
  );
}
