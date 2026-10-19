import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

export function ProjectDialog({ project, onClose, onSaved }) {
  const isEditing = Boolean(project);

  const [form, setForm] = useState({
    title: project?.title ?? "",
    description: project?.description ?? "",
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
    };

    try {
      const result = await apiRequest(
        isEditing ? `/api/projects/${project.id}` : "/api/projects",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      onSaved(result.data.project);
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
        aria-labelledby="project-dialog-title"
        aria-modal="true"
        className="dialog-card"
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">
              {isEditing ? "Update project" : "New project"}
            </p>
            <h2 id="project-dialog-title">
              {isEditing ? "Edit project" : "Create a project"}
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
            <span>Project title</span>
            <input
              autoFocus
              maxLength="100"
              name="title"
              onChange={handleChange}
              placeholder="For example: Website launch"
              required
              type="text"
              value={form.title}
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <textarea
              maxLength="1000"
              name="description"
              onChange={handleChange}
              placeholder="What should this project achieve?"
              rows="5"
              value={form.description}
            />
            <small>{form.description.length}/1000 characters</small>
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
                  : "Create project"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
