import { useEffect } from "react";
import { useLanguage } from "../context/language-context.js";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  isWorking,
  errorMessage,
  onCancel,
  onConfirm,
}) {
  const { t } = useLanguage();

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isWorking) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isWorking, onCancel]);

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !isWorking) {
      onCancel();
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={handleBackdropClick}>
      <section
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="dialog-card dialog-card--small"
        role="alertdialog"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow eyebrow--danger">{t("common.pleaseConfirm")}</p>
            <h2 id="confirm-dialog-title">{title}</h2>
          </div>

          <button
            aria-label={t("common.closeDialog")}
            className="dialog-close"
            disabled={isWorking}
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </header>

        <p className="dialog-message">{message}</p>

        {errorMessage && (
          <div className="form-message form-message--error" role="alert">
            {errorMessage}
          </div>
        )}

        <footer className="dialog-actions">
          <button
            className="button button--ghost"
            disabled={isWorking}
            onClick={onCancel}
            type="button"
          >
            {t("common.cancel")}
          </button>

          <button
            className="button button--danger"
            disabled={isWorking}
            onClick={onConfirm}
            type="button"
          >
            {isWorking ? t("common.deleting") : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
