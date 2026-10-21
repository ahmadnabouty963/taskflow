import { BrandLogo } from "../components/BrandLogo.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { ProjectDialog } from "../components/ProjectDialog.jsx";
import { WorkspaceDialog } from "../components/WorkspaceDialog.jsx";
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
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => window.localStorage.getItem("ordanly.activeWorkspaceId") || "",
  );
  const [projectsStatus, setProjectsStatus] = useState("loading");
  const [projectsError, setProjectsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [projectView, setProjectView] = useState("active");

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveNotice, setArchiveNotice] = useState("");
  const [archivingProjectId, setArchivingProjectId] = useState(null);
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkspace() {
      setProjectsStatus("loading");
      setProjectsError("");

      try {
        const [projectResult, workspaceResult] = await Promise.all([
          apiRequest("/api/projects", { signal: controller.signal }),
          apiRequest("/api/workspaces", { signal: controller.signal }),
        ]);
        const nextWorkspaces = workspaceResult.data.workspaces;
        setProjects(projectResult.data.projects);
        setWorkspaces(nextWorkspaces);
        setActiveWorkspaceId((currentId) => {
          const currentExists = nextWorkspaces.some(({ id }) => id === currentId);
          const nextId = currentExists ? currentId : nextWorkspaces[0]?.id || "";
          if (nextId) window.localStorage.setItem("ordanly.activeWorkspaceId", nextId);
          return nextId;
        });
        setProjectsStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setProjectsError(error.message);
          setProjectsStatus("error");
        }
      }
    }

    loadWorkspace();
    return () => controller.abort();
  }, [reloadKey]);

  const workspaceProjects = useMemo(
    () => projects.filter((project) => project.workspaceId === activeWorkspaceId),
    [activeWorkspaceId, projects],
  );
  const activeProjects = useMemo(
    () => workspaceProjects.filter((project) => !project.archivedAt),
    [workspaceProjects],
  );
  const archivedProjects = useMemo(
    () => workspaceProjects.filter((project) => Boolean(project.archivedAt)),
    [workspaceProjects],
  );
  const visibleProjects =
    projectView === "active" ? activeProjects : archivedProjects;

  function openCreateDialog() {
    setEditingProject(null);
    setIsProjectDialogOpen(true);
  }

  function selectWorkspace(event) {
    const workspaceId = event.target.value;
    setActiveWorkspaceId(workspaceId);
    window.localStorage.setItem("ordanly.activeWorkspaceId", workspaceId);
    setProjectView("active");
  }

  function handleWorkspaceSaved(workspace) {
    setWorkspaces((current) => [...current, workspace]);
    setActiveWorkspaceId(workspace.id);
    window.localStorage.setItem("ordanly.activeWorkspaceId", workspace.id);
    setIsWorkspaceDialogOpen(false);
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
      return projectExists
        ? currentProjects.map((project) =>
            project.id === savedProject.id ? savedProject : project,
          )
        : [savedProject, ...currentProjects];
    });
    setIsProjectDialogOpen(false);
    setEditingProject(null);
  }

  async function toggleProjectArchive(project) {
    const shouldArchive = !project.archivedAt;
    setArchiveError("");
    setArchiveNotice("");
    setArchivingProjectId(project.id);

    try {
      const result = await apiRequest(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: shouldArchive }),
      });
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === project.id
            ? result.data.project
            : currentProject,
        ),
      );
      setArchiveNotice(
        shouldArchive
          ? `${project.title} was archived.`
          : `${project.title} was restored.`,
      );
    } catch (error) {
      setArchiveError(error.message);
    } finally {
      setArchivingProjectId(null);
    }
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
            <BrandLogo />
          </Link>
          <div className="workspace-switcher">
            <label htmlFor="active-workspace">Workspace</label>
            <select id="active-workspace" onChange={selectWorkspace} value={activeWorkspaceId}>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
            <button onClick={() => setIsWorkspaceDialogOpen(true)} type="button">New team workspace</button>
            {activeWorkspaceId ? (
              <Link to={`/app/workspaces/${activeWorkspaceId}/settings`}>Members and roles</Link>
            ) : null}
          </div>
          <nav className="workspace-nav" aria-label="Workspace navigation">
            <Link className="workspace-nav__item workspace-nav__item--active" to="/app">Projects</Link>
            <Link className="workspace-nav__item" to="/app/today">Today</Link>
            <Link className="workspace-nav__item" to="/app/upcoming">Upcoming</Link>
            <Link className="workspace-nav__item" to="/app/calendar">Calendar</Link>
            <Link className="workspace-nav__item" to="/app/settings">Settings</Link>
          </nav>
        </div>
        <div className="workspace-user">
          <span className="user-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
          <button className="logout-button" disabled={isLoggingOut} onClick={handleLogout} type="button">
            {isLoggingOut ? "..." : "Log out"}
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div><p className="eyebrow">{workspaces.find(({ id }) => id === activeWorkspaceId)?.name || "Your workspace"}</p><h1>Projects</h1></div>
          <button className="button button--green" onClick={openCreateDialog} type="button">New project</button>
        </header>

        {logoutError && <div className="form-message form-message--error" role="alert">{logoutError}</div>}
        {archiveError && <div className="form-message form-message--error" role="alert">{archiveError}</div>}
        {archiveNotice && <div className="project-notice" role="status">{archiveNotice}</div>}

        <section id="projects">
          {projectsStatus === "loading" && (
            <div className="projects-loading" aria-live="polite"><span /><span /><span /><p>Loading projects...</p></div>
          )}

          {projectsStatus === "error" && (
            <div className="content-error" role="alert">
              <p className="eyebrow eyebrow--danger">Unable to load projects</p>
              <h2>Something went wrong.</h2><p>{projectsError}</p>
              <button className="button button--ghost" onClick={() => setReloadKey((key) => key + 1)} type="button">Try again</button>
            </div>
          )}

          {projectsStatus === "success" && workspaceProjects.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__number">01</span><h2>Create your first project</h2>
              <p>Projects give your work a clear home. Add one, then break the work into focused tasks.</p>
              <button className="button button--dark" onClick={openCreateDialog} type="button">Create a project</button>
            </div>
          )}

          {projectsStatus === "success" && workspaceProjects.length > 0 && (
            <>
              <div className="project-view-bar">
                <div className="project-view-tabs" role="tablist" aria-label="Project status">
                  <button aria-selected={projectView === "active"} className={projectView === "active" ? "is-active" : ""} onClick={() => setProjectView("active")} role="tab" type="button">
                    Active <span>{activeProjects.length}</span>
                  </button>
                  <button aria-selected={projectView === "archived"} className={projectView === "archived" ? "is-active" : ""} onClick={() => setProjectView("archived")} role="tab" type="button">
                    Archived <span>{archivedProjects.length}</span>
                  </button>
                </div>
                <p>{projectView === "active" ? "Projects currently in motion" : "Finished or paused projects"}</p>
              </div>

              {visibleProjects.length === 0 ? (
                <div className="empty-state empty-state--compact">
                  <h2>{projectView === "active" ? "No active projects" : "Nothing archived yet"}</h2>
                  <p>{projectView === "active" ? "Restore a project or start something new." : "Archived projects stay safe here until you restore them."}</p>
                  {projectView === "active" && <button className="button button--dark" onClick={openCreateDialog} type="button">Create a project</button>}
                </div>
              ) : (
                <div className="projects-grid">
                  {visibleProjects.map((project, index) => (
                    <article className={`project-card ${project.archivedAt ? "project-card--archived" : ""}`} key={project.id} style={{ "--project-color": project.color || "#6D5EF5" }}>
                      <div className="project-card__color" aria-hidden="true" />
                      <header>
                        <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
                        <div className="project-actions">
                          {!project.archivedAt && <button onClick={() => openEditDialog(project)} type="button">Edit</button>}
                          <button disabled={archivingProjectId === project.id} onClick={() => toggleProjectArchive(project)} type="button">
                            {archivingProjectId === project.id ? "Saving..." : project.archivedAt ? "Restore" : "Archive"}
                          </button>
                          <button className="project-delete" onClick={() => requestProjectDeletion(project)} type="button">Delete</button>
                        </div>
                      </header>
                      <Link className="project-card__link" to={`/app/projects/${project.id}`}>
                        <h2>{project.title}</h2>
                        <p>{project.description || "No description has been added yet."}</p>
                        <footer>
                          <span>{project.archivedAt ? `Archived ${dateFormatter.format(new Date(project.archivedAt))}` : `Updated ${dateFormatter.format(new Date(project.updatedAt))}`}</span>
                          <span aria-hidden="true">→</span>
                        </footer>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {isProjectDialogOpen && (
        <ProjectDialog onClose={() => { setIsProjectDialogOpen(false); setEditingProject(null); }} onSaved={handleProjectSaved} project={editingProject} workspaceId={activeWorkspaceId} />
      )}

      {isWorkspaceDialogOpen && (
        <WorkspaceDialog onClose={() => setIsWorkspaceDialogOpen(false)} onSaved={handleWorkspaceSaved} />
      )}

      {projectToDelete && (
        <ConfirmDialog
          confirmLabel="Delete project"
          errorMessage={deleteError}
          isWorking={isDeleting}
          message={`“${projectToDelete.title}” and all of its tasks will be permanently deleted.`}
          onCancel={() => { setProjectToDelete(null); setDeleteError(""); }}
          onConfirm={handleProjectDeletion}
          title="Delete this project?"
        />
      )}
    </div>
  );
}
