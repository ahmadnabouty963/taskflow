import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/auth-context.js";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message);
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div>
          <div className="workspace-brand">
            <span className="brand-logo brand-logo--light">O</span>
            <span>Ordanly</span>
          </div>

          <nav className="workspace-nav" aria-label="Workspace navigation">
            <a
              className="workspace-nav__item workspace-nav__item--active"
              href="#projects"
            >
              <span>Projects</span>
            </a>
          </nav>
        </div>

        <div className="workspace-user">
          <span className="user-avatar" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </span>

          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <button
            className="logout-button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            {isLoggingOut ? "..." : "Log out"}
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Your workspace</p>
            <h1>Projects</h1>
          </div>

          <button className="button button--green" type="button">
            New project
          </button>
        </header>

        {logoutError && (
          <div className="form-message form-message--error" role="alert">
            {logoutError}
          </div>
        )}

        <section className="empty-state" id="projects">
          <span className="empty-state__number">01</span>
          <h2>Create your first project</h2>
          <p>
            Projects give your work a clear home. Add one, then break the work
            into focused tasks.
          </p>
          <button className="button button--dark" type="button">
            Create a project
          </button>
        </section>
      </main>
    </div>
  );
}
