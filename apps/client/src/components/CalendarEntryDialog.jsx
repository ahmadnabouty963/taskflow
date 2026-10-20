import { useEffect } from "react";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function CalendarEntryDialog({
  date,
  canCreateTask,
  onClose,
  onEvent,
  onTask,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        aria-labelledby="calendar-entry-title"
        aria-modal="true"
        className="dialog-card dialog-card--small calendar-entry-dialog"
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{dateFormatter.format(new Date(date + "T12:00:00"))}</p>
            <h2 id="calendar-entry-title">What do you want to add?</h2>
          </div>
          <button
            aria-label="Close dialog"
            className="dialog-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="calendar-entry-options">
          <button disabled={!canCreateTask} onClick={onTask} type="button">
            <strong>Project task</strong>
            <span>Work that belongs to an existing project.</span>
          </button>
          <button onClick={onEvent} type="button">
            <strong>Calendar event</strong>
            <span>An appointment independent from your projects.</span>
          </button>
        </div>

        {!canCreateTask && (
          <p className="calendar-entry-note">
            Create an active project before adding project tasks.
          </p>
        )}
      </section>
    </div>
  );
}
