import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { TaskDialog } from "../components/TaskDialog.jsx";
import { useAuth } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

const weekRangeFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

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

function startOfWeek(date) {
  const result = startOfDay(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function isSameDay(first, second) {
  return dateKey(first) === dateKey(second);
}

export function CalendarPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [calendarView, setCalendarView] = useState("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const range = useMemo(() => {
    if (calendarView === "week") {
      const start = startOfWeek(anchorDate);
      return {
        start,
        end: addDays(start, 7),
        days: Array.from({ length: 7 }, (_, index) => addDays(start, index)),
      };
    }

    const monthStart = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      1,
    );
    const start = startOfWeek(monthStart);

    return {
      start,
      end: addDays(start, 42),
      days: Array.from({ length: 42 }, (_, index) => addDays(start, index)),
    };
  }, [anchorDate, calendarView]);

  useEffect(() => {
    document.title = "Calendar — Ordanly";
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      try {
        const result = await apiRequest("/api/projects", {
          signal: controller.signal,
        });
        setProjects(
          result.data.projects.filter((project) => !project.archivedAt),
        );
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setCreateError("Projects could not be loaded. Try refreshing the page.");
        }
      }
    }

    loadProjects();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCalendarTasks() {
      setStatus("loading");
      setError("");

      const query = new URLSearchParams({
        from: range.start.toISOString(),
        to: range.end.toISOString(),
        limit: "100",
      });

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

    loadCalendarTasks();

    return () => controller.abort();
  }, [range.end, range.start, reloadKey]);

  const tasksByDay = useMemo(() => {
    return tasks.reduce((groups, task) => {
      const key = dateKey(new Date(task.dueDate));
      groups[key] = [...(groups[key] ?? []), task];
      return groups;
    }, {});
  }, [tasks]);

  function movePeriod(direction) {
    if (calendarView === "week") {
      setAnchorDate((currentDate) => addDays(currentDate, direction * 7));
      return;
    }

    setAnchorDate((currentDate) => addMonths(currentDate, direction));
  }

  function showToday() {
    setAnchorDate(new Date());
  }

  function openTaskDialog(day) {
    setCreateError("");

    if (projects.length === 0) {
      setCreateError(
        "Create an active project before scheduling a task in the calendar.",
      );
      return;
    }

    setSelectedDate(dateKey(day));
  }

  function handleTaskCreated(task) {
    const project = projects.find((item) => item.id === task.projectId);

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        ...task,
        project: {
          id: project.id,
          title: project.title,
          color: project.color,
        },
      },
    ]);
    setSelectedDate(null);
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

  const visibleTitle =
    calendarView === "month"
      ? monthFormatter.format(anchorDate)
      : weekRangeFormatter.format(range.start) +
        " – " +
        weekRangeFormatter.format(addDays(range.end, -1));

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
            <Link className="workspace-nav__item" to="/app/today">
              Today
            </Link>
            <Link className="workspace-nav__item" to="/app/upcoming">
              Upcoming
            </Link>
            <Link
              className="workspace-nav__item workspace-nav__item--active"
              to="/app/calendar"
            >
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

      <main className="workspace-main calendar-main">
        <header className="workspace-header calendar-header">
          <div>
            <p className="eyebrow">All projects</p>
            <h1>Calendar</h1>
            <p>Select a day to schedule a task in one of your projects.</p>
          </div>
          <div className="calendar-view-toggle" role="group" aria-label="Calendar view">
            <button
              aria-pressed={calendarView === "month"}
              className={calendarView === "month" ? "calendar-toggle--active" : ""}
              onClick={() => setCalendarView("month")}
              type="button"
            >
              Month
            </button>
            <button
              aria-pressed={calendarView === "week"}
              className={calendarView === "week" ? "calendar-toggle--active" : ""}
              onClick={() => setCalendarView("week")}
              type="button"
            >
              Week
            </button>
          </div>
        </header>

        <section className="calendar-toolbar" aria-label="Calendar controls">
          <div className="calendar-toolbar__title">
            <span className="calendar-toolbar__label">
              {calendarView === "month" ? "Month overview" : "Week overview"}
            </span>
            <h2>{visibleTitle}</h2>
          </div>

          <div className="calendar-toolbar__actions">
            <button
              aria-label="Previous period"
              onClick={() => movePeriod(-1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="calendar-today-button"
              onClick={showToday}
              type="button"
            >
              Today
            </button>
            <button
              aria-label="Next period"
              onClick={() => movePeriod(1)}
              type="button"
            >
              Next
            </button>
          </div>

          <p className="calendar-toolbar__meta">
            <strong>{tasks.length}</strong>{" "}
            {tasks.length === 1 ? "task" : "tasks"} scheduled
          </p>
        </section>

        {error && (
          <div className="form-message form-message--error" role="alert">
            {error}
          </div>
        )}

        {createError && (
          <div className="form-message form-message--error" role="alert">
            {createError}
          </div>
        )}

        {status === "loading" && (
          <div className="board-loading" aria-live="polite">
            Loading calendar...
          </div>
        )}

        {status === "error" && (
          <div className="content-error">
            <h2>Calendar could not be loaded.</h2>
            <button
              className="button button--ghost"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="calendar-scroll">
            <section
              aria-label={calendarView === "month" ? "Month calendar" : "Week calendar"}
              className={
                "calendar-grid" +
                (calendarView === "week" ? " calendar-grid--week" : "")
              }
            >
              {range.days.slice(0, 7).map((day) => (
                <div className="calendar-weekday" key={"weekday-" + dateKey(day)}>
                  {dayFormatter.format(day)}
                </div>
              ))}

              {range.days.map((day) => {
                const key = dateKey(day);
                const dayTasks = tasksByDay[key] ?? [];
                const visibleTasks =
                  calendarView === "month" ? dayTasks.slice(0, 3) : dayTasks;
                const hiddenCount = dayTasks.length - visibleTasks.length;
                const outsideMonth =
                  calendarView === "month" &&
                  day.getMonth() !== anchorDate.getMonth();

                return (
                  <article
                    className={
                      "calendar-day calendar-day--interactive" +
                      (outsideMonth ? " calendar-day--outside" : "") +
                      (isSameDay(day, new Date()) ? " calendar-day--today" : "")
                    }
                    key={key}
                    onClick={(event) => {
                      if (!event.target.closest("a, button")) {
                        openTaskDialog(day);
                      }
                    }}
                  >
                    <header>
                      <button
                        aria-label={
                          "Add task on " + fullDateFormatter.format(day)
                        }
                        className="calendar-day__date-button"
                        onClick={() => openTaskDialog(day)}
                        type="button"
                      >
                        <time dateTime={key}>{day.getDate()}</time>
                        {calendarView === "week" && (
                          <span className="calendar-day__weekday">
                            {dayFormatter.format(day)}
                          </span>
                        )}
                        <span className="calendar-day__add-label">Add task</span>
                      </button>
                    </header>

                    <div className="calendar-day__tasks">
                      {calendarView === "week" && visibleTasks.length === 0 && (
                        <span className="calendar-day__empty">No tasks scheduled</span>
                      )}

                      {visibleTasks.map((task) => (
                        <Link
                          className={
                            "calendar-task calendar-task--" +
                            task.status.toLowerCase().replace("_", "-")
                          }
                          key={task.id}
                          style={{
                            "--calendar-project-color":
                              task.project.color ?? "var(--green)",
                          }}
                          title={task.title + " — " + task.project.title}
                          to={"/app/projects/" + task.project.id}
                        >
                          <span>{task.title}</span>
                          {calendarView === "week" && (
                            <small>{task.project.title}</small>
                          )}
                        </Link>
                      ))}

                      {hiddenCount > 0 && (
                        <span className="calendar-day__more">
                          +{hiddenCount} more
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        )}
      </main>

      {selectedDate && (
        <TaskDialog
          initialDueDate={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={handleTaskCreated}
          projects={projects}
        />
      )}
    </div>
  );
}
