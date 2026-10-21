import { useEffect, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { calendarName } from "../lib/calendars.js";

const EVENT_COLORS = ["#2F6049", "#DF6B43", "#3B6F92", "#7C5AA6", "#B64D5C"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function localDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTimeValue(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function nextDayIso(date) {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + 1);
  return result.toISOString();
}

export function EventDialog({
  event,
  initialDate,
  onClose,
  onRequestDelete,
  onSaved,
  readOnly = false,
  workspaces = [],
}) {
  const { t } = useLanguage();
  const isEditing = Boolean(event?.id);
  const defaultWorkspace =
    workspaces.find((workspace) => workspace.type === "PERSONAL") ??
    workspaces[0];
  const [form, setForm] = useState({
    workspaceId: event?.workspaceId ?? defaultWorkspace?.id ?? "",
    title: event?.title ?? "",
    description: event?.description ?? "",
    location: event?.location ?? "",
    date: localDateValue(event?.startsAt) || initialDate,
    startTime: localTimeValue(event?.startsAt, "09:00"),
    endTime: localTimeValue(event?.endsAt, "10:00"),
    allDay: event?.allDay ?? false,
    color: event?.color ?? EVENT_COLORS[0],
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(keyEvent) {
      if (keyEvent.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSubmitting, onClose]);

  function handleChange(changeEvent) {
    const { checked, name, type, value } = changeEvent.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setError("");

    const startsAt = form.allDay
      ? toIso(form.date, "00:00")
      : toIso(form.date, form.startTime);
    const endsAt = form.allDay
      ? nextDayIso(form.date)
      : toIso(form.date, form.endTime);

    if (new Date(endsAt) <= new Date(startsAt)) {
      setError(t("eventDialog.endAfterStart"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiRequest(
        isEditing ? `/api/events/${event.id}` : "/api/events",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            location: form.location.trim() || null,
            startsAt,
            endsAt,
            allDay: form.allDay,
            color: form.color,
            ...(form.workspaceId && { workspaceId: form.workspaceId }),
          }),
        },
      );
      onSaved(result.data.event);
    } catch (requestError) {
      setError(requestError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(mouseEvent) =>
        mouseEvent.target === mouseEvent.currentTarget && !isSubmitting && onClose()
      }
    >
      <section
        aria-labelledby="event-dialog-title"
        aria-modal="true"
        className="dialog-card event-dialog"
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{isEditing ? t("calendarEntry.event") : t("eventDialog.eyebrowNew")}</p>
            <h2 id="event-dialog-title">
              {readOnly ? t("eventDialog.titleDetails") : isEditing ? t("eventDialog.titleEdit") : t("eventDialog.titleNew")}
            </h2>
            {isEditing && event.owner && (
              <p className="event-dialog__meta">
                {t("eventDialog.meta", { calendar: calendarName(event.workspace, t), name: event.owner.name })}
              </p>
            )}
          </div>
          <button
            aria-label={t("common.closeDialog")}
            className="dialog-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="dialog-form" onSubmit={handleSubmit}>
          {error && <div className="form-message form-message--error" role="alert">{error}</div>}
          {readOnly && (
            <p className="form-message">
              {t("eventDialog.readOnly")}
            </p>
          )}

          <fieldset className="event-dialog__fields" disabled={readOnly}>
            {workspaces.length > 0 && !readOnly && (
              <label className="form-field">
                <span>{t("eventDialog.calendar")}</span>
                <select name="workspaceId" onChange={handleChange} value={form.workspaceId}>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {calendarName(workspace, t)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="form-field">
              <span>{t("eventDialog.name")}</span>
              <input
                autoFocus
                maxLength="120"
                name="title"
                onChange={handleChange}
                placeholder={t("eventDialog.namePlaceholder")}
                required
                type="text"
                value={form.title}
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span>{t("eventDialog.date")}</span>
                <input name="date" onChange={handleChange} required type="date" value={form.date} />
              </label>
              <label className="event-all-day">
                <input checked={form.allDay} name="allDay" onChange={handleChange} type="checkbox" />
                <span>{t("common.allDay")}</span>
              </label>
            </div>

            {!form.allDay && (
              <div className="form-grid">
                <label className="form-field">
                  <span>{t("eventDialog.start")}</span>
                  <input name="startTime" onChange={handleChange} required type="time" value={form.startTime} />
                </label>
                <label className="form-field">
                  <span>{t("eventDialog.end")}</span>
                  <input name="endTime" onChange={handleChange} required type="time" value={form.endTime} />
                </label>
              </div>
            )}

            <label className="form-field">
              <span>{t("eventDialog.location")}</span>
              <input
                maxLength="200"
                name="location"
                onChange={handleChange}
                placeholder={t("eventDialog.locationPlaceholder")}
                type="text"
                value={form.location}
              />
            </label>

            <label className="form-field">
              <span>{t("common.description")}</span>
              <textarea
                maxLength="2000"
                name="description"
                onChange={handleChange}
                placeholder={t("eventDialog.descriptionPlaceholder")}
                rows="3"
                value={form.description}
              />
            </label>

            <fieldset className="event-color-field">
              <legend>{t("eventDialog.color")}</legend>
              <div>
                {EVENT_COLORS.map((color) => (
                  <label key={color} style={{ "--event-choice-color": color }}>
                    <input checked={form.color === color} name="color" onChange={handleChange} type="radio" value={color} />
                    <span aria-hidden="true" />
                    <span className="sr-only">{color}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          {readOnly ? (
            <footer className="dialog-actions event-dialog__actions">
              <span className="event-dialog__spacer" />
              <button className="button button--dark" onClick={onClose} type="button">{t("common.close")}</button>
            </footer>
          ) : (
            <footer className="dialog-actions event-dialog__actions">
              {isEditing && (
                <button
                  className="button button--danger event-delete-button"
                  disabled={isSubmitting}
                  onClick={() => onRequestDelete(event)}
                  type="button"
                >
                  {t("common.delete")}
                </button>
              )}
              <span className="event-dialog__spacer" />
              <button className="button button--ghost" disabled={isSubmitting} onClick={onClose} type="button">{t("common.cancel")}</button>
              <button className="button button--dark" disabled={isSubmitting} type="submit">
                {isSubmitting ? t("common.saving") : isEditing ? t("common.saveChanges") : t("eventDialog.submit")}
              </button>
            </footer>
          )}
        </form>
      </section>
    </div>
  );
}
