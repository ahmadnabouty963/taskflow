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

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
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

function eventTimeLabel(event) {
  if (event.allDay) {
    return "All day";
  }

  return (
    timeFormatter.format(new Date(event.startsAt)) +
    "–" +
    timeFormatter.format(new Date(event.endsAt))
  );
}

function byStartTime(first, second) {
  if (first.allDay !== second.allDay) {
    return first.allDay ? -1 : 1;
  }

  return new Date(first.startsAt) - new Date(second.startsAt);
}

export function PlanningPage({ mode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
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

    async function loadAgenda() {
      setStatus("loading");
      setError("");

      const taskQuery = new URLSearchParams({
        excludeStatus: "DONE",
        limit: "100",
      });
      const eventQuery = new URLSearchParams();

      if (mode === "today") {
        taskQuery.set("from", new Date(0).toISOString());
        taskQuery.set("to", tomorrowStart.toISOString());
        eventQuery.set("from", todayStart.toISOString());
        eventQuery.set("to", tomorrowStart.toISOString());
      } else {
        const rangeEnd = addDays(tomorrowStart, 7).toISOString();
        taskQuery.set("from", tomorrowStart.toISOString());
        taskQuery.set("to", rangeEnd);
        eventQuery.set("from", tomorrowStart.toISOString());
        eventQuery.set("to", rangeEnd);
      }

      try {
        const [taskResult, eventResult] = await Promise.all([
          apiRequest("/api/tasks?" + taskQuery.toString(), {
            signal: controller.signal,
          }),
          apiRequest("/api/events?" + eventQuery.toString(), {
            signal: controller.signal,
          }),
        ]);
        setTasks(taskResult.data.tasks);
        setEvents(eventResult.data.events);
        setStatus("success");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setStatus("error");
        }
      }
    }

    loadAgenda();

    return () => controller.abort();
  }, [mode, reloadKey, todayStart, tomorrowStart]);

  const agendaGroups = useMemo(() => {
    const sortedEvents = [...events].sort(byStartTime);

    if (mode === "today") {
      const overdue = tasks.filter(
        (task) => new Date(task.dueDate) < todayStart,
      );
      const dueToday = tasks.filter(
        (task) => new Date(task.dueDate) >= todayStart,
      );

      return [
        ...(sortedEvents.length > 0
          ? [
              {
                key: "events",
                label: "Events today",
                events: sortedEvents,
                tasks: [],
              },
            ]
          : []),
        ...(overdue.length > 0
          ? [{ key: "overdue", label: "Overdue", events: [], tasks: overdue }]
          : []),
        ...(dueToday.length > 0
          ? [{ key: "today", label: "Due today", events: [], tasks: dueToday }]
          : []),
      ];
    }

    const groups = new Map();

    function groupFor(date) {
      const day = startOfDay(date);
      const key = day.toISOString();

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          day,
          label: dateFormatter.format(day),
          events: [],
          tasks: [],
        });
      }

      return groups.get(key);
    }

    for (const event of sortedEvents) {
      const startsAt = new Date(event.startsAt);
      // Events that began before the range are listed on its first day.
      groupFor(startsAt < tomorrowStart ? tomorrowStart : startsAt).events.push(
        event,
      );
    }

    for (const task of tasks) {
      groupFor(new Date(task.dueDate)).tasks.push(task);
    }

    return [...groups.values()].sort((first, second) => first.day - second.day);
  }, [events, mode, tasks, todayStart, tomorrowStart]);

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
      : "See events and deadlines across every project for the next seven days.";
  const isEmpty = tasks.length === 0 && events.length === 0;

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
            <strong>
              {events.length} {events.length === 1 ? "event" : "events"} ·{" "}
              {tasks.length} open {tasks.length === 1 ? "task" : "tasks"}
            </strong>
          </div>
        </header>

        {error && (
          <div className="form-message form-message--error" role="alert">
            {error}
          </div>
        )}

        {status === "loading" && (
          <div className="board-loading" aria-live="polite">
            Loading agenda...
          </div>
        )}

        {status === "error" && (
          <div className="content-error">
            <h2>Your agenda could not be loaded.</h2>
            <button
              className="button button--ghost"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {status === "success" && isEmpty && (
          <div className="empty-state planning-empty">
            <span className="empty-state__number">✓</span>
            <h2>{mode === "today" ? "Nothing urgent" : "A clear week ahead"}</h2>
            <p>
              {mode === "today"
                ? "You have no events, no overdue tasks and nothing due today."
                : "No events or open tasks during the next seven days."}
            </p>
            <Link className="button button--dark" to="/app">
              Open projects
            </Link>
          </div>
        )}

        {status === "success" && !isEmpty && (
          <div className="planning-groups">
            {agendaGroups.map((group) => (
              <section className="planning-group" key={group.key}>
                <header>
                  <h2>{group.label}</h2>
                  <span>{group.events.length + group.tasks.length}</span>
                </header>

                <div className="planning-task-list">
                  {group.events.map((event) => (
                    <article
                      className="planning-task planning-event"
                      key={"event-" + event.id}
                      style={{ "--event-color": event.color }}
                    >
                      <div className="planning-task__date">
                        <span className="planning-event__badge">Event</span>
                        <time dateTime={event.startsAt}>
                          {eventTimeLabel(event)}
                        </time>
                      </div>

                      <div className="planning-task__content">
                        <h3>{event.title}</h3>
                        {event.location && (
                          <p className="planning-event__location">
                            {event.location}
                          </p>
                        )}
                      </div>

                      <Link
                        className="planning-event__link"
                        to="/app/calendar"
                      >
                        Open calendar
                      </Link>
                    </article>
                  ))}

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
