import { useEffect } from "react";
import { useLanguage } from "../context/language-context.js";

export function CalendarEntryDialog({
  date,
  canCreateTask,
  onClose,
  onEvent,
  onTask,
}) {
  const { locale, t } = useLanguage();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
            <h2 id="calendar-entry-title">{t("calendarEntry.title")}</h2>
          </div>
          <button
            aria-label={t("common.closeDialog")}
            className="dialog-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="calendar-entry-options">
          <button disabled={!canCreateTask} onClick={onTask} type="button">
            <strong>{t("calendarEntry.task")}</strong>
            <span>{t("calendarEntry.taskCopy")}</span>
          </button>
          <button onClick={onEvent} type="button">
            <strong>{t("calendarEntry.event")}</strong>
            <span>{t("calendarEntry.eventCopy")}</span>
          </button>
        </div>

        {!canCreateTask && (
          <p className="calendar-entry-note">
            {t("calendarEntry.noProjects")}
          </p>
        )}
      </section>
    </div>
  );
}
