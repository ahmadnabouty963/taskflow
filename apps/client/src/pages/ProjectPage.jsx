import { AppNavigation } from "../components/AppNavigation.jsx";
import { BrandLogo } from "../components/BrandLogo.jsx";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { TaskDialog } from "../components/TaskDialog.jsx";
import { TaskDetailsPanel } from "../components/TaskDetailsPanel.jsx";
import { TaskCard } from "../components/TaskCard.jsx";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";

// Excalidraw is large, so it only loads when the whiteboard is opened.
const WhiteboardView = lazy(() => import("../components/WhiteboardView.jsx"));

const taskColumns = [
  {
    status: "TODO",
    number: "01",
  },
  {
    status: "IN_PROGRESS",
    number: "02",
  },
  {
    status: "DONE",
    number: "03",
  },
];

export function ProjectPage() {
  const { projectId } = useParams();
  const { t } = useLanguage();

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
    assigneeId: "",
    labelId: "",
  });
  const [taskOptions, setTaskOptions] = useState({ members: [], labels: [] });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [logoutError, setLogoutError] = useState("");
  const [viewMode, setViewMode] = useState("board");
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropStatus, setDropStatus] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);
  const [moveError, setMoveError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/projects/${projectId}/tasks/options`, { signal: controller.signal })
      .then((result) => setTaskOptions(result.data))
      .catch((error) => { if (error.name !== "AbortError") setTaskOptions({ members: [], labels: [] }); });
    return () => controller.abort();
  }, [projectId]);

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

      if (filters.priority) { query.set("priority", filters.priority); }
      if (filters.assigneeId) { query.set("assigneeId", filters.assigneeId); }
      if (filters.labelId) { query.set("labelId", filters.labelId); }

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
  }, [projectId, debouncedSearch, filters.status, filters.priority, filters.assigneeId, filters.labelId, reloadKey]);

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
    filters.search || filters.status || filters.priority || filters.assigneeId || filters.labelId,
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
      assigneeId: "",
      labelId: "",
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

  if (projectStatus === "loading") {
    return (
      <main className="loading-screen" aria-live="polite">
        <div className="loading-mark">O</div>
        <p>{t("project.loading")}</p>
      </main>
    );
  }

  if (projectStatus === "error") {
    return (
      <main className="project-error-page">
        <Link className="brand" to="/app">
          <BrandLogo />
        </Link>

        <div className="content-error" role="alert">
          <p className="eyebrow eyebrow--danger">{t("project.openError")}</p>
          <h2>{t("project.unavailable")}</h2>
          <p>{projectError}</p>
          <Link className="button button--dark" to="/app">
            {t("project.back")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="workspace-shell">
      <AppNavigation active="projects" currentProject onLogoutError={setLogoutError} />

      <main className="workspace-main workspace-main--project">
        <Link className="back-link" to="/app">
          ← {t("planning.eyebrow")}
        </Link>

        <header className="project-header">
          <div>
            <p className="eyebrow">{t("project.eyebrow")}</p>
            <h1>{project.title}</h1>
            <p>
              {project.description || t("project.noDescription")}
            </p>
          </div>

          <button
            className="button button--green"
            onClick={() => openCreateDialog()}
            type="button"
          >
            {t("taskDialog.eyebrowNew")}
          </button>
        </header>

        {projectProgress.status === "success" && (
          <section
            aria-label={t("project.completion")}
            className="project-progress"
          >
            <div className="project-progress__summary">
              <div>
                <span>{t("project.progress")}</span>
                <strong>{t("project.percentComplete", { percent: completionPercentage })}</strong>
              </div>

              <p>
                {t("project.completedCount", { completed: projectProgress.completed, total: projectProgress.total })}
              </p>
            </div>

            <div
              aria-label={t("project.completion")}
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

        <section className={"task-filters" + (viewMode === "whiteboard" ? " task-filters--whiteboard" : "")} aria-label={t("project.filtersLabel")}>
          <label className="task-search">
            <span className="visually-hidden">{t("project.search")}</span>
            <input
              name="search"
              onChange={handleFilterChange}
              placeholder={t("project.searchPlaceholder")}
              type="search"
              value={filters.search}
            />
          </label>

          <label>
            <span className="visually-hidden">{t("project.filterStatus")}</span>
            <select
              name="status"
              onChange={handleFilterChange}
              value={filters.status}
            >
              <option value="">{t("project.allStatuses")}</option>
              <option value="TODO">{t("task.status.TODO")}</option>
              <option value="IN_PROGRESS">{t("task.status.IN_PROGRESS")}</option>
              <option value="DONE">{t("task.status.DONE")}</option>
            </select>
          </label>

          <label>
            <span className="visually-hidden">{t("project.filterPriority")}</span>
            <select
              name="priority"
              onChange={handleFilterChange}
              value={filters.priority}
            >
              <option value="">{t("project.allPriorities")}</option>
              <option value="LOW">{t("project.priorityOption.LOW")}</option>
              <option value="MEDIUM">{t("project.priorityOption.MEDIUM")}</option>
              <option value="HIGH">{t("project.priorityOption.HIGH")}</option>
            </select>
          </label>

          <label><span className="visually-hidden">{t("project.filterPerson")}</span><select aria-label={t("project.filterPerson")} name="assigneeId" onChange={handleFilterChange} value={filters.assigneeId}><option value="">{t("project.allPeople")}</option>{taskOptions.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>

          <label><span className="visually-hidden">{t("project.filterLabel")}</span><select aria-label={t("project.filterLabel")} name="labelId" onChange={handleFilterChange} value={filters.labelId}><option value="">{t("project.allLabels")}</option>{taskOptions.labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}</select></label>

          {filtersAreActive && (
            <button
              className="clear-filters"
              onClick={clearFilters}
              type="button"
            >
              {t("project.clearFilters")}
            </button>
          )}

          <div className="view-toggle" role="group" aria-label={t("project.viewLabel")}>
            <button
              aria-pressed={viewMode === "board"}
              className={viewMode === "board" ? "view-toggle__active" : ""}
              onClick={() => setViewMode("board")}
              type="button"
            >
              {t("project.board")}
            </button>
            <button
              aria-pressed={viewMode === "list"}
              className={viewMode === "list" ? "view-toggle__active" : ""}
              onClick={() => setViewMode("list")}
              type="button"
            >
              {t("project.list")}
            </button>
            <button
              aria-pressed={viewMode === "whiteboard"}
              className={viewMode === "whiteboard" ? "view-toggle__active" : ""}
              onClick={() => setViewMode("whiteboard")}
              type="button"
            >
              {t("project.whiteboard")}
            </button>
          </div>
        </section>

        {moveError && (
          <div className="form-message form-message--error" role="alert">
            {moveError}
          </div>
        )}

        {tasksStatus === "error" && viewMode !== "whiteboard" && (
          <div className="content-error" role="alert">
            <p className="eyebrow eyebrow--danger">{t("project.tasksError")}</p>
            <h2>{t("errorBoundary.title")}</h2>
            <p>{tasksError}</p>
            <button
              className="button button--ghost"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              {t("common.tryAgain")}
            </button>
          </div>
        )}

        {tasksStatus === "loading" && viewMode !== "whiteboard" && (
          <div className="board-loading" aria-live="polite">
            {t("project.loadingTasks")}
          </div>
        )}

        {tasksStatus === "success" &&
          viewMode !== "whiteboard" &&
          tasks.length === 0 &&
          filtersAreActive && (
            <div className="filtered-empty-state">
              <h2>{t("project.noMatches")}</h2>
              <p>{t("project.noMatchesCopy")}</p>
              <button
                className="button button--ghost"
                onClick={clearFilters}
                type="button"
              >
                {t("project.clearFilters")}
              </button>
            </div>
          )}

        {tasksStatus === "success" && viewMode === "board" && (
          <section className="task-board" aria-label={t("project.boardLabel")}>
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
                    <h2>{t(`task.status.${column.status}`)}</h2>
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
                      statusLabel={t(`task.status.${column.status}`)}
                      task={task}
                    />
                  ))}

                  {tasksByStatus[column.status].length === 0 && (
                    <button
                      className="task-column__empty"
                      onClick={() => openCreateDialog(column.status)}
                      type="button"
                    >
                      {t("project.addTask")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        {tasksStatus === "success" && viewMode === "list" && (
          <section aria-label={t("project.listLabel")} className="task-list" role="list">
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
                statusLabel={t(`task.status.${task.status}`)}
                task={task}
              />
            ))}
          </section>
        )}

        {viewMode === "whiteboard" && (
          <Suspense fallback={<div className="board-loading" aria-live="polite">{t("whiteboard.loading")}</div>}>
            <WhiteboardView projectId={projectId} />
          </Suspense>
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
          confirmLabel={t("project.deleteConfirm")}
          errorMessage={deleteError}
          isWorking={isDeleting}
          message={t("calendar.deleteMessage", { title: taskToDelete.title })}
          onCancel={() => {
            setTaskToDelete(null);
            setDeleteError("");
          }}
          onConfirm={handleTaskDeletion}
          title={t("project.deleteTitle")}
        />
      )}
    </div>
  );
}
