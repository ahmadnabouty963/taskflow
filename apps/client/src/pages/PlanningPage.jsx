import { AppNavigation } from "../components/AppNavigation.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { calendarName, isSharedEvent } from "../lib/calendars.js";

const statuses = ["TODO", "IN_PROGRESS", "DONE"];

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

function byStartTime(first, second) {
  if (first.allDay !== second.allDay) {
    return first.allDay ? -1 : 1;
  }

  return new Date(first.startsAt) - new Date(second.startsAt);
}

export function PlanningPage({ mode }) {
  const { locale, t } = useLanguage();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const shortDateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  function eventTimeLabel(event) {
    if (event.allDay) {
      return t("common.allDay");
    }

    return (
      timeFormatter.format(new Date(event.startsAt)) +
      "–" +
      timeFormatter.format(new Date(event.endsAt))
    );
  }

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const tomorrowStart = useMemo(() => addDays(todayStart, 1), [todayStart]);

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
                labelKey: "planning.eventsToday",
                events: sortedEvents,
                tasks: [],
              },
            ]
          : []),
        ...(overdue.length > 0
          ? [{ key: "overdue", labelKey: "planning.overdue", events: [], tasks: overdue }]
          : []),
        ...(dueToday.length > 0
          ? [{ key: "today", labelKey: "planning.dueToday", events: [], tasks: dueToday }]
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

  const title = mode === "today" ? t("nav.today") : t("nav.upcoming");
  const description =
    mode === "today" ? t("planning.todayCopy") : t("planning.upcomingCopy");
  const isEmpty = tasks.length === 0 && events.length === 0;

  return (
    <div className="workspace-shell">
      <AppNavigation active={mode} onLogoutError={setError} />

      <main className="workspace-main planning-main">
        <header className="workspace-header planning-header">
          <div>
            <p className="eyebrow">{t("planning.eyebrow")}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="planning-date">
            <span>{dateFormatter.format(new Date())}</span>
            <strong>
              {t(events.length === 1 ? "planning.eventCount.one" : "planning.eventCount.other", { count: events.length })} ·{" "}
              {t(tasks.length === 1 ? "planning.taskCount.one" : "planning.taskCount.other", { count: tasks.length })}
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
            {t("planning.loading")}
          </div>
        )}

        {status === "error" && (
          <div className="content-error">
            <h2>{t("planning.loadError")}</h2>
            <button
              className="button button--ghost"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              {t("common.tryAgain")}
            </button>
          </div>
        )}

        {status === "success" && isEmpty && (
          <div className="empty-state planning-empty">
            <span className="empty-state__number">✓</span>
            <h2>{mode === "today" ? t("planning.emptyToday") : t("planning.emptyUpcoming")}</h2>
            <p>
              {mode === "today"
                ? t("planning.emptyTodayCopy")
                : t("planning.emptyUpcomingCopy")}
            </p>
            <Link className="button button--dark" to="/app">
              {t("planning.openProjects")}
            </Link>
          </div>
        )}

        {status === "success" && !isEmpty && (
          <div className="planning-groups">
            {agendaGroups.map((group) => (
              <section className="planning-group" key={group.key}>
                <header>
                  <h2>{group.labelKey ? t(group.labelKey) : dateFormatter.format(group.day)}</h2>
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
                        <span className="planning-event__badge">{t("planning.eventBadge")}</span>
                        <time dateTime={event.startsAt}>
                          {eventTimeLabel(event)}
                        </time>
                      </div>

                      <div className="planning-task__content">
                        <h3>{event.title}</h3>
                        {(event.location || isSharedEvent(event)) && (
                          <p className="planning-event__location">
                            {[
                              isSharedEvent(event) &&
                                t("planning.sharedBy", {
                                  calendar: calendarName(event.workspace, t),
                                  name: event.owner.name,
                                }),
                              event.location,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>

                      <Link
                        className="planning-event__link"
                        to="/app/calendar"
                      >
                        {t("planning.openCalendar")}
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
                          {t(`task.priority.${task.priority}`)}
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
                          {t("task.changeStatus", { title: task.title })}
                        </span>
                        <select
                          aria-label={t("task.changeStatus", { title: task.title })}
                          disabled={updatingTaskId === task.id}
                          onChange={(event) =>
                            handleStatusChange(task, event.target.value)
                          }
                          value={task.status}
                        >
                          {statuses.map((taskStatus) => (
                            <option key={taskStatus} value={taskStatus}>
                              {t(`task.status.${taskStatus}`)}
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
