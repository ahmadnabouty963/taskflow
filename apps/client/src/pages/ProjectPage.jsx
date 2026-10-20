import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { TaskDialog } from "../components/TaskDialog.jsx";
import { TaskDetailsPanel } from "../components/TaskDetailsPanel.jsx";
import { TaskCard } from "../components/TaskCard.jsx";
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
  const [projectProgress, setProjectProgress] = useState({
    completed: 0,
    total: 0,
    status: "loading",
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [viewMode, setViewMode] = useState("board");
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropStatus, setDropStatus] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);
  const [moveError, setMoveError] = useState("");

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjectProgress() {
      setProjectProgress((currentProgress) => ({
        ...currentProgress,
        status: "loading",
      }));

      try {
        const [allTasksResult, completedTasksResult] = await Promise.all([
          apiRequest(
            `/api/projects/${projectId}/tasks?page=1&limit=1`,
            { signal: controller.signal },
          ),
          apiRequest(
            `/api/projects/${projectId}/tasks?status=DONE&page=1&limit=1`,
            { signal: controller.signal },
          ),
        ]);

        setProjectProgress({
          completed: completedTasksResult.data.pagination.total,
          total: allTasksResult.data.pagination.total,
          status: "success",
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setProjectProgress((currentProgress) => ({
            ...currentProgress,
            status: "error",
          }));
        }
      }
    }

    loadProjectProgress();

    return () => {
      controller.abort();
    };
  }, [projectId, reloadKey]);

  const completionPercentage =
    projectProgress.total === 0
      ? 0
      : Math.round(
          (projectProgress.completed / projectProgress.total) * 100,
        );
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
      setReloadKey((key) => key + 1);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function moveTask(task, nextStatus) {
    if (task.status === nextStatus || movingTaskId === task.id) {
      return;
    }

    const previousTask = task;
    setMoveError("");
    setMovingTaskId(task.id);
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? { ...currentTask, status: nextStatus }
          : currentTask,
      ),
    );

    try {
      await apiRequest(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setReloadKey((key) => key + 1);
    } catch (error) {
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? previousTask : currentTask,
        ),
      );
      setMoveError(error.message);
    } finally {
      setMovingTaskId(null);
    }
  }

  function handleDragStart(event, task) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
    setDraggedTaskId(task.id);
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDropStatus(null);
  }

  function handleDragOver(event, status) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropStatus(status);
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDropStatus(null);
    }
  }

  function handleDrop(event, status) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const task = tasks.find((currentTask) => currentTask.id === taskId);

    setDraggedTaskId(null);
    setDropStatus(null);

    if (task) {
      moveTask(task, status);
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
            <Link className="workspace-nav__item" to="/app/today">
              Today
            </Link>
            <Link className="workspace-nav__item" to="/app/upcoming">
              Upcoming
            </Link>
            <Link className="workspace-nav__item" to="/app/calendar">
              Calendar
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

        {projectProgress.status === "success" && (
          <section
            aria-label="Project completion"
            className="project-progress"
          >
            <div className="project-progress__summary">
              <div>
                <span>Project progress</span>
                <strong>{completionPercentage}% complete</strong>
              </div>

              <p>
                {projectProgress.completed} of {projectProgress.total} tasks
                completed
              </p>
            </div>

            <div
              aria-label="Project completion"
              aria-valuemax="100"
              aria-valuemin="0"
              aria-valuenow={completionPercentage}
              className="project-progress__track"
              role="progressbar"
            >
              <span style={{ width: `${completionPercentage}%` }} />
            </div>
          </section>
        )}

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

          <div className="view-toggle" role="group" aria-label="Task view">
            <button
              aria-pressed={viewMode === "board"}
              className={viewMode === "board" ? "view-toggle__active" : ""}
              onClick={() => setViewMode("board")}
              type="button"
            >
              Board
            </button>
            <button
              aria-pressed={viewMode === "list"}
              className={viewMode === "list" ? "view-toggle__active" : ""}
              onClick={() => setViewMode("list")}
              type="button"
            >
              List
            </button>
          </div>
        </section>

        {moveError && (
          <div className="form-message form-message--error" role="alert">
            {moveError}
          </div>
        )}

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

        {tasksStatus === "success" && viewMode === "board" && (
          <section className="task-board" aria-label="Kanban board">
            {taskColumns.map((column) => (
              <article
                className={`task-column${
                  dropStatus === column.status
                    ? " task-column--drop-target"
                    : ""
                }`}
                key={column.status}
                onDragLeave={handleDragLeave}
                onDragOver={(event) => handleDragOver(event, column.status)}
                onDrop={(event) => handleDrop(event, column.status)}
              >
                <header className="task-column__header">
                  <div>
                    <span>{column.number}</span>
                    <h2>{column.label}</h2>
                  </div>
                  <span>{tasksByStatus[column.status].length}</span>
                </header>

                <div className="task-column__body">
                  {tasksByStatus[column.status].map((task) => (
                    <TaskCard
                      isMoving={movingTaskId === task.id}
                      key={task.id}
                      onDelete={requestTaskDeletion}
                      onDragEnd={handleDragEnd}
                      onDragStart={handleDragStart}
                      onEdit={openEditDialog}
                      onOpenDetails={setDetailTask}
                      onStatusChange={moveTask}
                      statusLabel={column.label}
                      task={task}
                    />
                  ))}

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

        {tasksStatus === "success" && viewMode === "list" && (
          <section aria-label="Task list" className="task-list" role="list">
            {tasks.map((task) => (
              <TaskCard
                isListView
                isMoving={movingTaskId === task.id}
                key={task.id}
                onDelete={requestTaskDeletion}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
                onEdit={openEditDialog}
                onOpenDetails={setDetailTask}
                onStatusChange={moveTask}
                statusLabel={
                  taskColumns.find((column) => column.status === task.status)
                    ?.label ?? task.status
                }
                task={task}
              />
            ))}
          </section>
        )}
      </main>

      {detailTask && (
        <TaskDetailsPanel
          key={detailTask.id}
          onClose={() => setDetailTask(null)}
          projectId={projectId}
          task={detailTask}
        />
      )}

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
