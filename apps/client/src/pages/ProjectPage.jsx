import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { TaskDialog } from "../components/TaskDialog.jsx";
import { useAuth } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";

const taskColumns = [
  {
    status: "TODO",
    label: "To do",
    number: "01",
  },
  {
    status: "IN_PROGRESS",
    label: "In progress",
    number: "02",
  },
  {
    status: "DONE",
    label: "Done",
    number: "03",
  },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatStatus(status) {
  return status.toLowerCase().replace("_", "-");
}

function formatPriority(priority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function ProjectPage() {
  const { projectId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectStatus, setProjectStatus] = useState("loading");
  const [projectError, setProjectError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [tasksStatus, setTasksStatus] = useState("loading");
  const [tasksError, setTasksError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters.search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProject() {
      setProjectStatus("loading");
      setProjectError("");

      try {
        const result = await apiRequest(`/api/projects/${projectId}`, {
          signal: controller.signal,
        });

        setProject(result.data.project);
        setProjectStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setProjectError(error.message);
          setProjectStatus("error");
        }
      }
    }

    loadProject();

    return () => {
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      setTasksStatus("loading");
      setTasksError("");

      const query = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      if (debouncedSearch) {
        query.set("search", debouncedSearch);
      }

      if (filters.status) {
        query.set("status", filters.status);
      }

      if (filters.priority) {
        query.set("priority", filters.priority);
      }

      try {
        const result = await apiRequest(
          `/api/projects/${projectId}/tasks?${query.toString()}`,
          {
            signal: controller.signal,
          },
        );

        setTasks(result.data.tasks);
        setTasksStatus("success");
      } catch (error) {
        if (error.name !== "AbortError") {
          setTasksError(error.message);
          setTasksStatus("error");
        }
      }
    }

    loadTasks();

    return () => {
      controller.abort();
    };
  }, [projectId, debouncedSearch, filters.status, filters.priority, reloadKey]);

  const tasksByStatus = useMemo(() => {
    return taskColumns.reduce((groups, column) => {
      groups[column.status] = tasks.filter(
        (task) => task.status === column.status,
      );
      return groups;
    }, {});
  }, [tasks]);

  const filtersAreActive = Boolean(
    filters.search || filters.status || filters.priority,
  );

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      status: "",
      priority: "",
    });
  }

  function openCreateDialog(status = "TODO") {
    setEditingTask({
      status,
      priority: "MEDIUM",
    });
    setIsTaskDialogOpen(true);
  }

  function openEditDialog(task) {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  }

  function handleTaskSaved() {
    setIsTaskDialogOpen(false);
    setEditingTask(null);
    setReloadKey((key) => key + 1);
  }

  function requestTaskDeletion(task) {
    setDeleteError("");
    setTaskToDelete(task);
  }

  async function handleTaskDeletion() {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await apiRequest(`/api/projects/${projectId}/tasks/${taskToDelete.id}`, {
        method: "DELETE",
      });

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskToDelete.id),
      );
      setTaskToDelete(null);
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

  if (projectStatus === "loading") {
    return (
      <main className="loading-screen" aria-live="polite">
        <div className="loading-mark">O</div>
        <p>Loading project...</p>
      </main>
    );
  }

  if (projectStatus === "error") {
    return (
      <main className="project-error-page">
        <Link className="brand" to="/app">
          <span className="brand-logo">O</span>
          <span>Ordanly</span>
        </Link>

        <div className="content-error" role="alert">
          <p className="eyebrow eyebrow--danger">Unable to open project</p>
          <h2>Project unavailable.</h2>
          <p>{projectError}</p>
          <Link className="button button--dark" to="/app">
            Back to projects
          </Link>
        </div>
      </main>
    );
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
            <Link className="workspace-nav__item" to="/app">
              Projects
            </Link>
            <span className="workspace-nav__item workspace-nav__item--active">
              Current project
            </span>
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

      <main className="workspace-main workspace-main--project">
        <Link className="back-link" to="/app">
          ← All projects
        </Link>

        <header className="project-header">
          <div>
            <p className="eyebrow">Project workspace</p>
            <h1>{project.title}</h1>
            <p>
              {project.description || "No project description has been added."}
            </p>
          </div>

          <button
            className="button button--green"
            onClick={() => openCreateDialog()}
            type="button"
          >
            New task
          </button>
        </header>

        {logoutError && (
          <div className="form-message form-message--error" role="alert">
            {logoutError}
          </div>
        )}

        <section className="task-filters" aria-label="Task filters">
          <label className="task-search">
            <span className="visually-hidden">Search tasks</span>
            <input
              name="search"
              onChange={handleFilterChange}
              placeholder="Search tasks..."
              type="search"
              value={filters.search}
            />
          </label>

          <label>
            <span className="visually-hidden">Filter by status</span>
            <select
              name="status"
              onChange={handleFilterChange}
              value={filters.status}
            >
              <option value="">All statuses</option>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>
          </label>

          <label>
            <span className="visually-hidden">Filter by priority</span>
            <select
              name="priority"
              onChange={handleFilterChange}
              value={filters.priority}
            >
              <option value="">All priorities</option>
              <option value="LOW">Low priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="HIGH">High priority</option>
            </select>
          </label>

          {filtersAreActive && (
            <button
              className="clear-filters"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          )}
        </section>

        {tasksStatus === "error" && (
          <div className="content-error" role="alert">
            <p className="eyebrow eyebrow--danger">Unable to load tasks</p>
            <h2>Something went wrong.</h2>
            <p>{tasksError}</p>
            <button
              className="button button--ghost"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {tasksStatus === "loading" && (
          <div className="board-loading" aria-live="polite">
            Loading tasks...
          </div>
        )}

        {tasksStatus === "success" &&
          tasks.length === 0 &&
          filtersAreActive && (
            <div className="filtered-empty-state">
              <h2>No matching tasks</h2>
              <p>Try changing or clearing the current filters.</p>
              <button
                className="button button--ghost"
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            </div>
          )}

        {tasksStatus === "success" && (
          <section className="task-board" aria-label="Project tasks">
            {taskColumns.map((column) => (
              <article className="task-column" key={column.status}>
                <header className="task-column__header">
                  <div>
                    <span>{column.number}</span>
                    <h2>{column.label}</h2>
                  </div>
                  <span>{tasksByStatus[column.status].length}</span>
                </header>

                <div className="task-column__body">
                  {tasksByStatus[column.status].map((task) => {
                    const isOverdue =
                      task.dueDate &&
                      task.status !== "DONE" &&
                      new Date(task.dueDate) < new Date();

                    return (
                      <article className="task-card" key={task.id}>
                        <header>
                          <span
                            className={`priority-badge priority-badge--${task.priority.toLowerCase()}`}
                          >
                            {formatPriority(task.priority)}
                          </span>

                          <span
                            className={`status-dot status-dot--${formatStatus(task.status)}`}
                            aria-label={column.label}
                          />
                        </header>

                        <h3>{task.title}</h3>

                        {task.description && <p>{task.description}</p>}

                        <footer>
                          <span
                            className={isOverdue ? "task-due--overdue" : ""}
                          >
                            {task.dueDate
                              ? `${isOverdue ? "Overdue" : "Due"} ${dateFormatter.format(
                                  new Date(task.dueDate),
                                )}`
                              : "No due date"}
                          </span>

                          <div>
                            <button
                              onClick={() => openEditDialog(task)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="project-delete"
                              onClick={() => requestTaskDeletion(task)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </footer>
                      </article>
                    );
                  })}

                  {tasksByStatus[column.status].length === 0 && (
                    <button
                      className="task-column__empty"
                      onClick={() => openCreateDialog(column.status)}
                      type="button"
                    >
                      + Add a task
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {isTaskDialogOpen && (
        <TaskDialog
          onClose={() => {
            setIsTaskDialogOpen(false);
            setEditingTask(null);
          }}
          onSaved={handleTaskSaved}
          projectId={projectId}
          task={editingTask}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          confirmLabel="Delete task"
          errorMessage={deleteError}
          isWorking={isDeleting}
          message={`“${taskToDelete.title}” will be permanently deleted.`}
          onCancel={() => {
            setTaskToDelete(null);
            setDeleteError("");
          }}
          onConfirm={handleTaskDeletion}
          title="Delete this task?"
        />
      )}
    </div>
  );
}
