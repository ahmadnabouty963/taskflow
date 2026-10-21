import { BrandLogo } from "../components/BrandLogo.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
});

const statuses = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
];

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function priorityLabel(priority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function PlanningPage({ mode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const tomorrowStart = useMemo(() => addDays(todayStart, 1), [todayStart]);

  useEffect(() => {
    document.title =
      (mode === "today" ? "Today" : "Upcoming") + " — Ordanly";
  }, [mode]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      setStatus("loading");
      setError("");

      const query = new URLSearchParams({
        excludeStatus: "DONE",
        limit: "100",
      });

      if (mode === "today") {
        query.set("from", new Date(0).toISOString());
        query.set("to", tomorrowStart.toISOString());
      } else {
        query.set("from", tomorrowStart.toISOString());
        query.set("to", addDays(tomorrowStart, 7).toISOString());
      }

      try {
        const result = await apiRequest("/api/tasks?" + query.toString(), {
          signal: controller.signal,
        });
        setTasks(result.data.tasks);
        setStatus("success");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setStatus("error");
        }
      }
    }

    loadTasks();

    return () => controller.abort();
  }, [mode, reloadKey, tomorrowStart]);

  const taskGroups = useMemo(() => {
    if (mode === "today") {
      const overdue = tasks.filter(
        (task) => new Date(task.dueDate) < todayStart,
      );
      const dueToday = tasks.filter(
        (task) => new Date(task.dueDate) >= todayStart,
      );

      return [
        ...(overdue.length > 0
          ? [{ key: "overdue", label: "Overdue", tasks: overdue }]
          : []),
        { key: "today", label: "Today", tasks: dueToday },
      ];
    }

    const groups = new Map();

    for (const task of tasks) {
      const date = startOfDay(new Date(task.dueDate));
      const key = date.toISOString();

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: dateFormatter.format(date),
          tasks: [],
        });
      }

      groups.get(key).tasks.push(task);
    }

    return [...groups.values()];
  }, [mode, tasks, todayStart]);

  async function handleStatusChange(task, nextStatus) {
    const previousTasks = tasks;
    setError("");
    setUpdatingTaskId(task.id);
    setTasks((currentTasks) =>
      nextStatus === "DONE"
        ? currentTasks.filter((currentTask) => currentTask.id !== task.id)
        : currentTasks.map((currentTask) =>
            currentTask.id === task.id
              ? { ...currentTask, status: nextStatus }
              : currentTask,
          ),
    );

    try {
      await apiRequest(
        "/api/projects/" + task.project.id + "/tasks/" + task.id,
        {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
        },
      );
    } catch (requestError) {
      setTasks(previousTasks);
      setError(requestError.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setIsLoggingOut(false);
    }
  }

  const title = mode === "today" ? "Today" : "Upcoming";
  const description =
    mode === "today"
      ? "Focus on overdue work and everything due today."
      : "See deadlines across every project for the next seven days.";

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div>
          <Link className="workspace-brand" to="/">
            <BrandLogo />
          </Link>

          <nav className="workspace-nav" aria-label="Workspace navigation">
            <Link className="workspace-nav__item" to="/app">
              Projects
            </Link>
            <Link
              className={
                "workspace-nav__item" +
                (mode === "today" ? " workspace-nav__item--active" : "")
              }
              to="/app/today"
            >
              Today
            </Link>
            <Link
              className={
                "workspace-nav__item" +
                (mode === "upcoming" ? " workspace-nav__item--active" : "")
              }
              to="/app/upcoming"
            >
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

      <main className="workspace-main planning-main">
        <header className="workspace-header planning-header">
          <div>
            <p className="eyebrow">All projects</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="planning-date">
            <span>{dateFormatter.format(new Date())}</span>
            <strong>{tasks.length} open tasks</strong>
          </div>
        </header>

        {error && (
          <div className="form-message form-message--error" role="alert">
            {error}
          </div>
        )}

        {status === "loading" && (
          <div className="board-loading" aria-live="polite">
            Loading tasks...
          </div>
        )}

        {status === "error" && (
          <div className="content-error">
            <h2>Tasks could not be loaded.</h2>
            <button
              className="button button--ghost"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {status === "success" && tasks.length === 0 && (
          <div className="empty-state planning-empty">
            <span className="empty-state__number">✓</span>
            <h2>{mode === "today" ? "Nothing urgent" : "A clear week ahead"}</h2>
            <p>
              {mode === "today"
                ? "You have no overdue tasks and nothing due today."
                : "No open tasks are due during the next seven days."}
            </p>
            <Link className="button button--dark" to="/app">
              Open projects
            </Link>
          </div>
        )}

        {status === "success" && tasks.length > 0 && (
          <div className="planning-groups">
            {taskGroups.map((group) => (
              <section className="planning-group" key={group.key}>
                <header>
                  <h2>{group.label}</h2>
                  <span>{group.tasks.length}</span>
                </header>

                <div className="planning-task-list">
                  {group.tasks.map((task) => (
                    <article className="planning-task" key={task.id}>
                      <div className="planning-task__date">
                        <span
                          className={
                            "priority-badge priority-badge--" +
                            task.priority.toLowerCase()
                          }
                        >
                          {priorityLabel(task.priority)}
                        </span>
                        <time dateTime={task.dueDate}>
                          {shortDateFormatter.format(new Date(task.dueDate))}
                        </time>
                      </div>

                      <div className="planning-task__content">
                        <h3>{task.title}</h3>
                        <Link to={"/app/projects/" + task.project.id}>
                          {task.project.title}
                        </Link>
                      </div>

                      <label className="planning-task__status">
                        <span className="visually-hidden">
                          Change status for {task.title}
                        </span>
                        <select
                          aria-label={"Change status for " + task.title}
                          disabled={updatingTaskId === task.id}
                          onChange={(event) =>
                            handleStatusChange(task, event.target.value)
                          }
                          value={task.status}
                        >
                          {statuses.map((taskStatus) => (
                            <option key={taskStatus.value} value={taskStatus.value}>
                              {taskStatus.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
