import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

const projectColors = [
  { label: "Violet", value: "#6D5EF5" },
  { label: "Blue", value: "#2563EB" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Green", value: "#16A34A" },
  { label: "Amber", value: "#D97706" },
  { label: "Rose", value: "#E11D48" },
];

export function ProjectDialog({ project, onClose, onSaved }) {
  const isEditing = Boolean(project?.id);

  const [form, setForm] = useState({
    title: project?.title ?? "",
    description: project?.description ?? "",
    color: project?.color ?? projectColors[0].value,
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
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      color: form.color,
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
              rows="4"
              value={form.description}
            />
            <small>{form.description.length}/1000 characters</small>
          </label>

          <fieldset className="project-color-field">
            <legend>Project color</legend>
            <div className="project-color-options">
              {projectColors.map((color) => (
                <label key={color.value} title={color.label}>
                  <input
                    checked={form.color === color.value}
                    name="color"
                    onChange={handleChange}
                    type="radio"
                    value={color.value}
                  />
                  <span
                    aria-label={color.label}
                    className="project-color-swatch"
                    style={{ "--swatch-color": color.value }}
                  />
                </label>
              ))}
            </div>
          </fieldset>

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
