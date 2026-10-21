import { useEffect, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";

const projectColors = [
  { key: "violet", value: "#6D5EF5" },
  { key: "blue", value: "#2563EB" },
  { key: "sky", value: "#0EA5E9" },
  { key: "green", value: "#16A34A" },
  { key: "amber", value: "#D97706" },
  { key: "rose", value: "#E11D48" },
];

export function ProjectDialog({ project, workspaceId, onClose, onSaved }) {
  const { t } = useLanguage();
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
      ...(!isEditing && workspaceId ? { workspaceId } : {}),
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
              {isEditing ? t("projectDialog.eyebrowEdit") : t("projectDialog.eyebrowNew")}
            </p>
            <h2 id="project-dialog-title">
              {isEditing ? t("projectDialog.titleEdit") : t("projectDialog.titleNew")}
            </h2>
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
          {errorMessage && (
            <div className="form-message form-message--error" role="alert">
              {errorMessage}
            </div>
          )}

          <label className="form-field">
            <span>{t("projectDialog.name")}</span>
            <input
              autoFocus
              maxLength="100"
              name="title"
              onChange={handleChange}
              placeholder={t("projectDialog.namePlaceholder")}
              required
              type="text"
              value={form.title}
            />
          </label>

          <label className="form-field">
            <span>{t("common.description")}</span>
            <textarea
              maxLength="1000"
              name="description"
              onChange={handleChange}
              placeholder={t("projectDialog.descriptionPlaceholder")}
              rows="4"
              value={form.description}
            />
            <small>{t("projectDialog.characters", { count: form.description.length })}</small>
          </label>

          <fieldset className="project-color-field">
            <legend>{t("projectDialog.color")}</legend>
            <div className="project-color-options">
              {projectColors.map((color) => (
                <label key={color.value} title={t(`color.${color.key}`)}>
                  <input
                    checked={form.color === color.value}
                    name="color"
                    onChange={handleChange}
                    type="radio"
                    value={color.value}
                  />
                  <span
                    aria-label={t(`color.${color.key}`)}
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
              {t("common.cancel")}
            </button>

            <button
              className="button button--dark"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? t("common.saving")
                : isEditing
                  ? t("common.saveChanges")
                  : t("projectDialog.submit")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
