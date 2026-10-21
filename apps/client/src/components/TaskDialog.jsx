import { useEffect, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";

const EMPTY_PROJECTS = [];
const LABEL_COLORS = ["#6D5EF5", "#0EA5E9", "#16A34A", "#F59E0B", "#E11D48", "#64748B"];

function getDateInputValue(date) { return date ? new Date(date).toISOString().slice(0, 10) : ""; }
function getIsoDate(date) { return date ? new Date(`${date}T12:00:00.000Z`).toISOString() : null; }

export function TaskDialog({ projectId, projects = EMPTY_PROJECTS, initialDueDate = "", task, onClose, onSaved }) {
  const { t } = useLanguage();
  const isEditing = Boolean(task?.id);
  const [form, setForm] = useState({
    projectId: projectId ?? projects[0]?.id ?? "",
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
    dueDate: getDateInputValue(task?.dueDate ?? initialDueDate),
    recurrence: task?.recurrence ?? "NONE",
    estimatedMinutes: task?.estimatedMinutes?.toString() ?? "",
    actualMinutes: task?.actualMinutes?.toString() ?? "",
    assigneeId: task?.assigneeId ?? task?.assignee?.id ?? "",
    labelIds: task?.labels?.map(({ id }) => id) ?? [],
  });
  const [options, setOptions] = useState({ workspaceId: "", members: [], labels: [], canCreateLabels: false });
  const [optionsStatus, setOptionsStatus] = useState("loading");
  const [optionsError, setOptionsError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const selectedProjectId = projectId ?? form.projectId;

  useEffect(() => {
    if (!selectedProjectId) return undefined;
    const controller = new AbortController();
    apiRequest(`/api/projects/${selectedProjectId}/tasks/options`, { signal: controller.signal })
      .then((result) => { setOptions(result.data); setOptionsStatus("success"); })
      .catch((error) => { if (error.name !== "AbortError") { setOptionsError(error.message); setOptionsStatus("error"); } });
    return () => controller.abort();
  }, [selectedProjectId]);

  useEffect(() => {
    function handleKeyDown(event) { if (event.key === "Escape" && !isSubmitting) onClose(); }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = ""; };
  }, [isSubmitting, onClose]);

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "projectId") { setOptionsStatus("loading"); setOptionsError(""); }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleLabel(labelId) {
    setForm((current) => ({
      ...current,
      labelIds: current.labelIds.includes(labelId)
        ? current.labelIds.filter((id) => id !== labelId)
        : [...current.labelIds, labelId],
    }));
  }

  async function createLabel(event) {
    event.preventDefault();
    const name = newLabelName.trim();
    if (!name || !options.workspaceId) return;
    setIsCreatingLabel(true);
    setOptionsError("");
    try {
      const result = await apiRequest(`/api/workspaces/${options.workspaceId}/labels`, {
        method: "POST",
        body: JSON.stringify({ name, color: newLabelColor }),
      });
      setOptions((current) => ({ ...current, labels: [...current.labels, result.data.label].toSorted((a, b) => a.name.localeCompare(b.name)) }));
      setForm((current) => ({ ...current, labelIds: [...current.labelIds, result.data.label.id] }));
      setNewLabelName("");
    } catch (error) { setOptionsError(error.message); }
    finally { setIsCreatingLabel(false); }
  }

  async function handleSubmit(event) {
    event.preventDefault(); setErrorMessage(""); setIsSubmitting(true);
    if (form.recurrence !== "NONE" && !form.dueDate) {
      setErrorMessage(t("taskDialog.recurrenceNeedsDate"));
      setIsSubmitting(false);
      return;
    }
    const payload = {
      title: form.title.trim(), description: form.description.trim(), status: form.status,
      priority: form.priority, dueDate: getIsoDate(form.dueDate),
      recurrence: form.recurrence,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
      actualMinutes: form.actualMinutes ? Number(form.actualMinutes) : null,
      assigneeId: form.assigneeId || null, labelIds: form.labelIds,
    };
    try {
      const basePath = `/api/projects/${selectedProjectId}/tasks`;
      const result = await apiRequest(isEditing ? `${basePath}/${task.id}` : basePath, {
        method: isEditing ? "PATCH" : "POST", body: JSON.stringify(payload),
      });
      onSaved(result.data.task);
    } catch (error) { setErrorMessage(error.message); setIsSubmitting(false); }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}>
      <section aria-labelledby="task-dialog-title" aria-modal="true" className="dialog-card dialog-card--wide" role="dialog">
        <header className="dialog-header"><div><p className="eyebrow">{isEditing ? t("taskDialog.eyebrowEdit") : t("taskDialog.eyebrowNew")}</p><h2 id="task-dialog-title">{isEditing ? t("taskDialog.titleEdit") : t("taskDialog.titleNew")}</h2></div><button aria-label={t("common.closeDialog")} className="dialog-close" disabled={isSubmitting} onClick={onClose} type="button">×</button></header>
        <form className="dialog-form" onSubmit={handleSubmit}>
          {errorMessage ? <div className="form-message form-message--error" role="alert">{errorMessage}</div> : null}
          {!isEditing && projects.length > 0 ? <label className="form-field"><span>{t("taskDialog.project")}</span><select name="projectId" onChange={handleChange} required value={form.projectId}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label> : null}
          <label className="form-field"><span>{t("taskDialog.name")}</span><input autoFocus maxLength="150" name="title" onChange={handleChange} placeholder={t("taskDialog.namePlaceholder")} required type="text" value={form.title} /></label>
          <label className="form-field"><span>{t("common.description")}</span><textarea maxLength="2000" name="description" onChange={handleChange} placeholder={t("taskDialog.descriptionPlaceholder")} rows="4" value={form.description} /><small>{t("taskDialog.characters", { count: form.description.length })}</small></label>
          <div className="form-grid">
            <label className="form-field"><span>{t("taskDialog.status")}</span><select name="status" onChange={handleChange} value={form.status}><option value="TODO">{t("task.status.TODO")}</option><option value="IN_PROGRESS">{t("task.status.IN_PROGRESS")}</option><option value="DONE">{t("task.status.DONE")}</option></select></label>
            <label className="form-field"><span>{t("taskDialog.priority")}</span><select name="priority" onChange={handleChange} value={form.priority}><option value="LOW">{t("task.priority.LOW")}</option><option value="MEDIUM">{t("task.priority.MEDIUM")}</option><option value="HIGH">{t("task.priority.HIGH")}</option></select></label>
            <label className="form-field"><span>{t("taskDialog.dueDate")}</span><input name="dueDate" onChange={handleChange} type="date" value={form.dueDate} /></label>
            <label className="form-field"><span>{t("taskDialog.assignee")}</span><select disabled={optionsStatus !== "success"} name="assigneeId" onChange={handleChange} value={form.assigneeId}><option value="">{t("task.unassigned")}</option>{options.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
            <label className="form-field"><span>{t("taskDialog.repeat")}</span><select aria-label={t("taskDialog.repeat")} name="recurrence" onChange={handleChange} value={form.recurrence}><option value="NONE">{t("task.recurrence.NONE")}</option><option value="DAILY">{t("task.recurrence.DAILY")}</option><option value="WEEKLY">{t("task.recurrence.WEEKLY")}</option><option value="MONTHLY">{t("task.recurrence.MONTHLY")}</option></select><small>{t("taskDialog.repeatHint")}</small></label>
            <label className="form-field"><span>{t("taskDialog.estimated")}</span><input inputMode="numeric" min="1" name="estimatedMinutes" onChange={handleChange} placeholder={t("taskDialog.examplePrefix", { value: 90 })} type="number" value={form.estimatedMinutes} /></label>
            <label className="form-field"><span>{t("taskDialog.spent")}</span><input inputMode="numeric" min="1" name="actualMinutes" onChange={handleChange} placeholder={t("taskDialog.examplePrefix", { value: 45 })} type="number" value={form.actualMinutes} /></label>
          </div>
          <fieldset className="task-label-field"><legend>{t("taskDialog.labels")}</legend>
            {optionsStatus === "loading" ? <p>{t("taskDialog.loadingOptions")}</p> : null}
            {optionsError ? <p className="field-error" role="alert">{optionsError}</p> : null}
            {options.labels.length ? <div className="task-label-options">{options.labels.map((label) => <label key={label.id}><input checked={form.labelIds.includes(label.id)} onChange={() => toggleLabel(label.id)} type="checkbox" /><span style={{ "--label-color": label.color }}>{label.name}</span></label>)}</div> : optionsStatus === "success" ? <p>{t("taskDialog.noLabels")}</p> : null}
          </fieldset>
          {options.canCreateLabels ? <div className="label-create-row"><label className="form-field"><span>{t("taskDialog.newLabel")}</span><input maxLength="40" onChange={(event) => setNewLabelName(event.target.value)} placeholder={t("taskDialog.examplePrefix", { value: "Design" })} value={newLabelName} /></label><label className="label-color-control"><span>{t("eventDialog.color")}</span><input aria-label={t("taskDialog.labelColor")} onChange={(event) => setNewLabelColor(event.target.value.toUpperCase())} type="color" value={newLabelColor} /></label><button className="button button--ghost" disabled={isCreatingLabel || !newLabelName.trim()} onClick={createLabel} type="button">{isCreatingLabel ? t("taskDialog.adding") : t("taskDialog.addLabel")}</button></div> : null}
          <footer className="dialog-actions"><button className="button button--ghost" disabled={isSubmitting} onClick={onClose} type="button">{t("common.cancel")}</button><button className="button button--dark" disabled={isSubmitting} type="submit">{isSubmitting ? t("common.saving") : isEditing ? t("common.saveChanges") : t("taskDialog.submit")}</button></footer>
        </form>
      </section>
    </div>
  );
}
