import { BrandLogo } from "../components/BrandLogo.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CalendarEntryDialog } from "../components/CalendarEntryDialog.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EventDialog } from "../components/EventDialog.jsx";
import { TaskDialog } from "../components/TaskDialog.jsx";
import { useAuth } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weekRangeFormatter = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const result = startOfDay(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(first, second) {
  return dateKey(first) === dateKey(second);
}

function groupByDay(items, getDate) {
  return items.reduce((groups, item) => {
    const key = dateKey(getDate(item));
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

export function CalendarPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [calendarView, setCalendarView] = useState("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [createMode, setCreateMode] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const range = useMemo(() => {
    if (calendarView === "week") {
      const start = startOfWeek(anchorDate);
      return { start, end: addDays(start, 7), days: Array.from({ length: 7 }, (_, index) => addDays(start, index)) };
    }
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const start = startOfWeek(monthStart);
    return { start, end: addDays(start, 42), days: Array.from({ length: 42 }, (_, index) => addDays(start, index)) };
  }, [anchorDate, calendarView]);

  useEffect(() => {
    document.title = "Calendar — Ordanly";
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/projects", { signal: controller.signal })
      .then((result) => setProjects(result.data.projects.filter((project) => !project.archivedAt)))
      .catch((requestError) => requestError.name !== "AbortError" && setError(requestError.message));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCalendar() {
      setStatus("loading");
      setError("");
      const query = new URLSearchParams({ from: range.start.toISOString(), to: range.end.toISOString(), limit: "100" });
      const eventQuery = new URLSearchParams({ from: range.start.toISOString(), to: range.end.toISOString() });
      try {
        const [taskResult, eventResult] = await Promise.all([
          apiRequest("/api/tasks?" + query, { signal: controller.signal }),
          apiRequest("/api/events?" + eventQuery, { signal: controller.signal }),
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
    loadCalendar();
    return () => controller.abort();
  }, [range.end, range.start, reloadKey]);

  const tasksByDay = useMemo(() => groupByDay(tasks, (task) => new Date(task.dueDate)), [tasks]);
  const eventsByDay = useMemo(() => groupByDay(events, (event) => new Date(event.startsAt)), [events]);

  function movePeriod(direction) {
    setAnchorDate((current) => calendarView === "week" ? addDays(current, direction * 7) : addMonths(current, direction));
  }

  function closeCreateFlow() {
    setSelectedDate(null);
    setCreateMode(null);
  }

  function handleTaskCreated(task) {
    const project = projects.find((item) => item.id === task.projectId);
    setTasks((current) => [...current, { ...task, project: { id: project.id, title: project.title, color: project.color } }]);
    closeCreateFlow();
  }

  function handleEventSaved(savedEvent) {
    setEvents((current) => current.some((event) => event.id === savedEvent.id)
      ? current.map((event) => event.id === savedEvent.id ? savedEvent : event)
      : [...current, savedEvent]);
    setEditingEvent(null);
    closeCreateFlow();
  }

  async function handleEventDeletion() {
    setDeleteError("");
    setIsDeleting(true);
    try {
      await apiRequest(`/api/events/${eventToDelete.id}`, { method: "DELETE" });
      setEvents((current) => current.filter((event) => event.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setIsDeleting(false);
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

  const visibleTitle = calendarView === "month"
    ? monthFormatter.format(anchorDate)
    : `${weekRangeFormatter.format(range.start)} – ${weekRangeFormatter.format(addDays(range.end, -1))}`;

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div>
          <Link className="workspace-brand" to="/"><BrandLogo /></Link>
          <nav className="workspace-nav" aria-label="Workspace navigation">
            <Link className="workspace-nav__item" to="/app">Projects</Link>
            <Link className="workspace-nav__item" to="/app/today">Today</Link>
            <Link className="workspace-nav__item" to="/app/upcoming">Upcoming</Link>
            <Link className="workspace-nav__item workspace-nav__item--active" to="/app/calendar">Calendar</Link>
            <Link className="workspace-nav__item" to="/app/settings">Settings</Link>
          </nav>
        </div>
        <div className="workspace-user">
          <span className="user-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
          <button className="logout-button" disabled={isLoggingOut} onClick={handleLogout} type="button">{isLoggingOut ? "..." : "Log out"}</button>
        </div>
      </aside>

      <main className="workspace-main calendar-main">
        <header className="workspace-header calendar-header">
          <div><p className="eyebrow">Tasks and appointments</p><h1>Calendar</h1><p>Select a day to create a project task or an independent calendar event.</p></div>
          <div className="calendar-view-toggle" role="group" aria-label="Calendar view">
            <button aria-pressed={calendarView === "month"} className={calendarView === "month" ? "calendar-toggle--active" : ""} onClick={() => setCalendarView("month")} type="button">Month</button>
            <button aria-pressed={calendarView === "week"} className={calendarView === "week" ? "calendar-toggle--active" : ""} onClick={() => setCalendarView("week")} type="button">Week</button>
          </div>
        </header>

        <section className="calendar-toolbar" aria-label="Calendar controls">
          <div className="calendar-toolbar__title"><span className="calendar-toolbar__label">{calendarView === "month" ? "Month overview" : "Week overview"}</span><h2>{visibleTitle}</h2></div>
          <div className="calendar-toolbar__actions">
            <button aria-label="Previous period" onClick={() => movePeriod(-1)} type="button">Previous</button>
            <button className="calendar-today-button" onClick={() => setAnchorDate(new Date())} type="button">Today</button>
            <button aria-label="Next period" onClick={() => movePeriod(1)} type="button">Next</button>
          </div>
          <p className="calendar-toolbar__meta"><strong>{tasks.length}</strong> tasks · <strong>{events.length}</strong> events</p>
        </section>

        {error && <div className="form-message form-message--error" role="alert">{error}</div>}
        {status === "loading" && <div className="board-loading" aria-live="polite">Loading calendar...</div>}
        {status === "error" && <div className="content-error"><h2>Calendar could not be loaded.</h2><button className="button button--ghost" onClick={() => setReloadKey((key) => key + 1)} type="button">Try again</button></div>}

        {status === "success" && (
          <div className="calendar-scroll">
            <section aria-label={calendarView === "month" ? "Month calendar" : "Week calendar"} className={"calendar-grid" + (calendarView === "week" ? " calendar-grid--week" : "")}>
              {range.days.slice(0, 7).map((day) => <div className="calendar-weekday" key={"weekday-" + dateKey(day)}>{dayFormatter.format(day)}</div>)}
              {range.days.map((day) => {
                const key = dateKey(day);
                const dayEvents = eventsByDay[key] ?? [];
                const dayTasks = tasksByDay[key] ?? [];
                const limit = calendarView === "month" ? 3 : Number.POSITIVE_INFINITY;
                const visibleEvents = dayEvents.slice(0, limit);
                const visibleTasks = dayTasks.slice(0, Math.max(0, limit - visibleEvents.length));
                const hiddenCount = dayEvents.length + dayTasks.length - visibleEvents.length - visibleTasks.length;
                const outsideMonth = calendarView === "month" && day.getMonth() !== anchorDate.getMonth();
                return (
                  <article className={"calendar-day calendar-day--interactive" + (outsideMonth ? " calendar-day--outside" : "") + (isSameDay(day, new Date()) ? " calendar-day--today" : "")} key={key} onClick={(clickEvent) => { if (!clickEvent.target.closest("a, button")) { setSelectedDate(key); setCreateMode("choose"); } }}>
                    <header><button aria-label={"Add entry on " + key} className="calendar-day__date-button" onClick={() => { setSelectedDate(key); setCreateMode("choose"); }} type="button"><time dateTime={key}>{day.getDate()}</time>{calendarView === "week" && <span className="calendar-day__weekday">{dayFormatter.format(day)}</span>}<span className="calendar-day__add-label">Add</span></button></header>
                    <div className="calendar-day__tasks">
                      {calendarView === "week" && dayEvents.length + dayTasks.length === 0 && <span className="calendar-day__empty">No entries</span>}
                      {visibleEvents.map((event) => (
                        <button className="calendar-event" key={event.id} onClick={() => setEditingEvent(event)} style={{ "--calendar-event-color": event.color }} type="button">
                          <span>{event.title}</span><small>{event.allDay ? "All day" : timeFormatter.format(new Date(event.startsAt))}{event.location ? ` · ${event.location}` : ""}</small>
                        </button>
                      ))}
                      {visibleTasks.map((task) => <Link className={"calendar-task calendar-task--" + task.status.toLowerCase().replace("_", "-")} key={task.id} style={{ "--calendar-project-color": task.project.color ?? "var(--green)" }} title={task.title + " — " + task.project.title} to={"/app/projects/" + task.project.id}><span>{task.title}</span>{calendarView === "week" && <small>{task.project.title}</small>}</Link>)}
                      {hiddenCount > 0 && <span className="calendar-day__more">+{hiddenCount} more</span>}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        )}
      </main>

      {selectedDate && createMode === "choose" && <CalendarEntryDialog canCreateTask={projects.length > 0} date={selectedDate} onClose={closeCreateFlow} onEvent={() => setCreateMode("event")} onTask={() => setCreateMode("task")} />}
      {selectedDate && createMode === "task" && <TaskDialog initialDueDate={selectedDate} onClose={closeCreateFlow} onSaved={handleTaskCreated} projects={projects} />}
      {selectedDate && createMode === "event" && <EventDialog initialDate={selectedDate} onClose={closeCreateFlow} onRequestDelete={() => {}} onSaved={handleEventSaved} />}
      {editingEvent && <EventDialog event={editingEvent} initialDate={dateKey(new Date(editingEvent.startsAt))} onClose={() => setEditingEvent(null)} onRequestDelete={(event) => { setEditingEvent(null); setEventToDelete(event); }} onSaved={handleEventSaved} />}
      {eventToDelete && <ConfirmDialog confirmLabel="Delete event" errorMessage={deleteError} isWorking={isDeleting} message={`“${eventToDelete.title}” will be permanently deleted.`} onCancel={() => { setEventToDelete(null); setDeleteError(""); }} onConfirm={handleEventDeletion} title="Delete this event?" />}
    </div>
  );
}
