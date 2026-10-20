import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

export function WorkspaceDialog({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await apiRequest("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      onSaved(result.data.workspace);
    } catch (requestError) {
      setError(requestError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <section
        aria-labelledby="workspace-dialog-title"
        aria-modal="true"
        className="dialog-card dialog-card--compact"
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">Team workspace</p>
            <h2 id="workspace-dialog-title">Create a shared workspace</h2>
          </div>
          <button aria-label="Close dialog" className="dialog-close" disabled={isSubmitting} onClick={onClose} type="button">×</button>
        </header>
        <form className="dialog-form" onSubmit={handleSubmit}>
          {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}
          <label className="form-field">
            <span>Workspace name</span>
            <input autoFocus maxLength="80" minLength="2" onChange={(event) => setName(event.target.value)} placeholder="For example: Product team" required value={name} />
          </label>
          <p className="workspace-dialog-note">You become the owner. Add members and choose their roles from workspace settings.</p>
          <footer className="dialog-actions">
            <button className="button button--ghost" disabled={isSubmitting} onClick={onClose} type="button">Cancel</button>
            <button className="button button--dark" disabled={isSubmitting} type="submit">{isSubmitting ? "Creating..." : "Create workspace"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
