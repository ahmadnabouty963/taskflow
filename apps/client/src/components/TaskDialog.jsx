import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api.js";

const EMPTY_PROJECTS = [];
const LABEL_COLORS = ["#6D5EF5", "#0EA5E9", "#16A34A", "#F59E0B", "#E11D48", "#64748B"];

function getDateInputValue(date) { return date ? new Date(date).toISOString().slice(0, 10) : ""; }
function getIsoDate(date) { return date ? new Date(`${date}T12:00:00.000Z`).toISOString() : null; }

export function TaskDialog({ projectId, projects = EMPTY_PROJECTS, initialDueDate = "", task, onClose, onSaved }) {
  const isEditing = Boolean(task?.id);
  const [form, setForm] = useState({
    projectId: projectId ?? projects[0]?.id ?? "",
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
    dueDate: getDateInputValue(task?.dueDate ?? initialDueDate),
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
    const payload = {
      title: form.title.trim(), description: form.description.trim(), status: form.status,
      priority: form.priority, dueDate: getIsoDate(form.dueDate),
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
        <header className="dialog-header"><div><p className="eyebrow">{isEditing ? "Update task" : "New task"}</p><h2 id="task-dialog-title">{isEditing ? "Edit task" : "Create a task"}</h2></div><button aria-label="Close dialog" className="dialog-close" disabled={isSubmitting} onClick={onClose} type="button">×</button></header>
        <form className="dialog-form" onSubmit={handleSubmit}>
          {errorMessage ? <div className="form-message form-message--error" role="alert">{errorMessage}</div> : null}
          {!isEditing && projects.length > 0 ? <label className="form-field"><span>Project</span><select name="projectId" onChange={handleChange} required value={form.projectId}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label> : null}
          <label className="form-field"><span>Task title</span><input autoFocus maxLength="150" name="title" onChange={handleChange} placeholder="What needs to be done?" required type="text" value={form.title} /></label>
          <label className="form-field"><span>Description</span><textarea maxLength="2000" name="description" onChange={handleChange} placeholder="Add useful context or acceptance criteria." rows="4" value={form.description} /><small>{form.description.length}/2000 characters</small></label>
          <div className="form-grid">
            <label className="form-field"><span>Status</span><select name="status" onChange={handleChange} value={form.status}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select></label>
            <label className="form-field"><span>Priority</span><select name="priority" onChange={handleChange} value={form.priority}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
            <label className="form-field"><span>Due date</span><input name="dueDate" onChange={handleChange} type="date" value={form.dueDate} /></label>
            <label className="form-field"><span>Responsible person</span><select disabled={optionsStatus !== "success"} name="assigneeId" onChange={handleChange} value={form.assigneeId}><option value="">Unassigned</option>{options.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          </div>
          <fieldset className="task-label-field"><legend>Labels</legend>
            {optionsStatus === "loading" ? <p>Loading workspace options...</p> : null}
            {optionsError ? <p className="field-error" role="alert">{optionsError}</p> : null}
            {options.labels.length ? <div className="task-label-options">{options.labels.map((label) => <label key={label.id}><input checked={form.labelIds.includes(label.id)} onChange={() => toggleLabel(label.id)} type="checkbox" /><span style={{ "--label-color": label.color }}>{label.name}</span></label>)}</div> : optionsStatus === "success" ? <p>No labels yet. Create the first one below.</p> : null}
          </fieldset>
          {options.canCreateLabels ? <div className="label-create-row"><label className="form-field"><span>New label</span><input maxLength="40" onChange={(event) => setNewLabelName(event.target.value)} placeholder="e.g. Design" value={newLabelName} /></label><label className="label-color-control"><span>Color</span><input aria-label="Label color" onChange={(event) => setNewLabelColor(event.target.value.toUpperCase())} type="color" value={newLabelColor} /></label><button className="button button--ghost" disabled={isCreatingLabel || !newLabelName.trim()} onClick={createLabel} type="button">{isCreatingLabel ? "Adding..." : "Add label"}</button></div> : null}
          <footer className="dialog-actions"><button className="button button--ghost" disabled={isSubmitting} onClick={onClose} type="button">Cancel</button><button className="button button--dark" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create task"}</button></footer>
        </form>
      </section>
    </div>
  );
}
