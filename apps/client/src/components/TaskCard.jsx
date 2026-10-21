const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" });
const statuses = [{ value: "TODO", label: "To do" }, { value: "IN_PROGRESS", label: "In progress" }, { value: "DONE", label: "Done" }];
function formatPriority(priority) { return priority.charAt(0) + priority.slice(1).toLowerCase(); }
function formatMinutes(minutes) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : "", rest ? `${rest}m` : ""].filter(Boolean).join(" ");
}
const recurrenceLabels = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };

export function TaskCard({ task, statusLabel, isMoving, isListView = false, onEdit, onDelete, onOpenDetails, onStatusChange, onDragStart, onDragEnd }) {
  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
  return (
    <article aria-busy={isMoving} className={`task-card${isMoving ? " task-card--moving" : ""}${isListView ? " task-card--list" : ""}`} draggable={!isMoving} onDragEnd={onDragEnd} onDragStart={(event) => onDragStart(event, task)} role={isListView ? "listitem" : undefined}>
      <header><span className={`priority-badge priority-badge--${task.priority.toLowerCase()}`}>{formatPriority(task.priority)}</span><span className="task-card__drag-hint" aria-hidden="true">⋮⋮</span></header>
      <div className="task-card__content"><h3>{task.title}</h3>{task.description ? <p>{task.description}</p> : null}</div>
      {task.labels?.length ? <div className="task-card__labels" aria-label="Task labels">{task.labels.map((label) => <span key={label.id} style={{ "--label-color": label.color }}>{label.name}</span>)}</div> : null}
      <div className="task-card__assignment"><span className={task.assignee ? "assignee-avatar" : "assignee-avatar assignee-avatar--empty"} aria-hidden="true">{task.assignee?.name?.charAt(0).toUpperCase() || "–"}</span><span>{task.assignee?.name || "Unassigned"}</span></div>
      {(task.recurrence && task.recurrence !== "NONE") || task.estimatedMinutes || task.actualMinutes ? <div className="task-card__schedule" aria-label="Task schedule and time">{task.recurrence && task.recurrence !== "NONE" ? <span>↻ {recurrenceLabels[task.recurrence]}</span> : null}{task.estimatedMinutes ? <span>Estimate {formatMinutes(task.estimatedMinutes)}</span> : null}{task.actualMinutes ? <span>Spent {formatMinutes(task.actualMinutes)}</span> : null}</div> : null}
      <footer><span className={isOverdue ? "task-due--overdue" : ""}>{task.dueDate ? `${isOverdue ? "Overdue" : "Due"} ${dateFormatter.format(new Date(task.dueDate))}` : "No due date"}</span><div className="task-card__controls"><label className="task-status-control"><span className="visually-hidden">Change status for {task.title}</span><select aria-label={`Change status for ${task.title}`} disabled={isMoving} onChange={(event) => onStatusChange(task, event.target.value)} value={task.status}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><div className="task-card__actions"><button onClick={() => onOpenDetails(task)} type="button">Details</button><button onClick={() => onEdit(task)} type="button">Edit</button><button className="project-delete" onClick={() => onDelete(task)} type="button">Delete</button></div></div></footer>
      <span className="visually-hidden">Current status: {statusLabel}</span>
    </article>
  );
}
