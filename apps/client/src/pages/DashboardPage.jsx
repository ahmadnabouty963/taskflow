import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { ProjectDialog } from "../components/ProjectDialog.jsx";
import { useAuth } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [projectsStatus, setProjectsStatus] = useState("loading");
  const [projectsError, setProjectsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      setProjectsStatus("loading");
      setProjectsError("");

      try {
        const result = await apiRequest("/api/projects", {
          signal: controller.signal,
        });

        setProjects(result.data.projects);
        setProjectsStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setProjectsError(error.message);
          setProjectsStatus("error");
        }
      }
    }

    loadProjects();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  function openCreateDialog() {
    setEditingProject(null);
    setIsProjectDialogOpen(true);
  }

  function openEditDialog(project) {
    setEditingProject(project);
    setIsProjectDialogOpen(true);
  }

  function handleProjectSaved(savedProject) {
    setProjects((currentProjects) => {
      const projectExists = currentProjects.some(
        (project) => project.id === savedProject.id,
      );

      if (projectExists) {
        return currentProjects.map((project) =>
          project.id === savedProject.id ? savedProject : project,
        );
      }

      return [savedProject, ...currentProjects];
    });

    setIsProjectDialogOpen(false);
    setEditingProject(null);
  }

  function requestProjectDeletion(project) {
    setDeleteError("");
    setProjectToDelete(project);
  }

  async function handleProjectDeletion() {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await apiRequest(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectToDelete.id),
      );
      setProjectToDelete(null);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsDeleting(false);
    }
  }

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
          <Link className="workspace-brand" to="/">
            <span className="brand-logo brand-logo--light">O</span>
            <span>Ordanly</span>
          </Link>

          <nav className="workspace-nav" aria-label="Workspace navigation">
            <Link
              className="workspace-nav__item workspace-nav__item--active"
              to="/app"
            >
              Projects
            </Link>
            <Link className="workspace-nav__item" to="/app/settings">
              Settings
            </Link>
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

          <button
            className="button button--green"
            onClick={openCreateDialog}
            type="button"
          >
            New project
          </button>
        </header>

        {logoutError && (
          <div className="form-message form-message--error" role="alert">
            {logoutError}
          </div>
        )}

        <section id="projects">
          {projectsStatus === "loading" && (
            <div className="projects-loading" aria-live="polite">
              <span />
              <span />
              <span />
              <p>Loading projects...</p>
            </div>
          )}

          {projectsStatus === "error" && (
            <div className="content-error" role="alert">
              <p className="eyebrow eyebrow--danger">Unable to load projects</p>
              <h2>Something went wrong.</h2>
              <p>{projectsError}</p>
              <button
                className="button button--ghost"
                onClick={() => setReloadKey((key) => key + 1)}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {projectsStatus === "success" && projects.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__number">01</span>
              <h2>Create your first project</h2>
              <p>
                Projects give your work a clear home. Add one, then break the
                work into focused tasks.
              </p>
              <button
                className="button button--dark"
                onClick={openCreateDialog}
                type="button"
              >
                Create a project
              </button>
            </div>
          )}

          {projectsStatus === "success" && projects.length > 0 && (
            <div className="projects-grid">
              {projects.map((project, index) => (
                <article className="project-card" key={project.id}>
                  <header>
                    <span className="project-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="project-actions">
                      <button
                        onClick={() => openEditDialog(project)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="project-delete"
                        onClick={() => requestProjectDeletion(project)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </header>

                  <Link
                    className="project-card__link"
                    to={`/app/projects/${project.id}`}
                  >
                    <h2>{project.title}</h2>
                    <p>
                      {project.description ||
                        "No description has been added yet."}
                    </p>

                    <footer>
                      <span>
                        Updated{" "}
                        {dateFormatter.format(new Date(project.updatedAt))}
                      </span>
                      <span aria-hidden="true">→</span>
                    </footer>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {isProjectDialogOpen && (
        <ProjectDialog
          onClose={() => {
            setIsProjectDialogOpen(false);
            setEditingProject(null);
          }}
          onSaved={handleProjectSaved}
          project={editingProject}
        />
      )}

      {projectToDelete && (
        <ConfirmDialog
          confirmLabel="Delete project"
          errorMessage={deleteError}
          isWorking={isDeleting}
          message={`“${projectToDelete.title}” and all of its tasks will be permanently deleted.`}
          onCancel={() => {
            setProjectToDelete(null);
            setDeleteError("");
          }}
          onConfirm={handleProjectDeletion}
          title="Delete this project?"
        />
      )}
    </div>
  );
}
