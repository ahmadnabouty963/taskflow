import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

function getDateInputValue(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().slice(0, 10);
}

function getIsoDate(date) {
  if (!date) {
    return null;
  }

  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function TaskDialog({ projectId, task, onClose, onSaved }) {
  const isEditing = Boolean(task?.id);

  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
    dueDate: getDateInputValue(task?.dueDate),
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isSubmitting, onClose]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: getIsoDate(form.dueDate),
    };

    try {
      const basePath = `/api/projects/${projectId}/tasks`;
      const result = await apiRequest(
        isEditing ? `${basePath}/${task.id}` : basePath,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      onSaved(result.data.task);
    } catch (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={handleBackdropClick}>
      <section
        aria-labelledby="task-dialog-title"
        aria-modal="true"
        className="dialog-card"
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{isEditing ? "Update task" : "New task"}</p>
            <h2 id="task-dialog-title">
              {isEditing ? "Edit task" : "Create a task"}
            </h2>
          </div>

          <button
            aria-label="Close dialog"
            className="dialog-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="dialog-form" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="form-message form-message--error" role="alert">
              {errorMessage}
            </div>
          )}

          <label className="form-field">
            <span>Task title</span>
            <input
              autoFocus
              maxLength="150"
              name="title"
              onChange={handleChange}
              placeholder="What needs to be done?"
              required
              type="text"
              value={form.title}
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <textarea
              maxLength="2000"
              name="description"
              onChange={handleChange}
              placeholder="Add useful context or acceptance criteria."
              rows="4"
              value={form.description}
            />
            <small>{form.description.length}/2000 characters</small>
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Status</span>
              <select name="status" onChange={handleChange} value={form.status}>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>

            <label className="form-field">
              <span>Priority</span>
              <select
                name="priority"
                onChange={handleChange}
                value={form.priority}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Due date</span>
            <input
              name="dueDate"
              onChange={handleChange}
              type="date"
              value={form.dueDate}
            />
          </label>

          <footer className="dialog-actions">
            <button
              className="button button--ghost"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>

            <button
              className="button button--dark"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create task"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
