import { useLanguage } from "../context/language-context.js";

const statuses = ["TODO", "IN_PROGRESS", "DONE"];
function formatMinutes(minutes) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : "", rest ? `${rest}m` : ""].filter(Boolean).join(" ");
}

export function TaskCard({ task, statusLabel, isMoving, isListView = false, onEdit, onDelete, onOpenDetails, onStatusChange, onDragStart, onDragEnd }) {
  const { locale, t } = useLanguage();
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
  return (
    <article aria-busy={isMoving} className={`task-card${isMoving ? " task-card--moving" : ""}${isListView ? " task-card--list" : ""}`} draggable={!isMoving} onDragEnd={onDragEnd} onDragStart={(event) => onDragStart(event, task)} role={isListView ? "listitem" : undefined}>
      <header><span className={`priority-badge priority-badge--${task.priority.toLowerCase()}`}>{t(`task.priority.${task.priority}`)}</span><span className="task-card__drag-hint" aria-hidden="true">⋮⋮</span></header>
      <div className="task-card__content"><h3>{task.title}</h3>{task.description ? <p>{task.description}</p> : null}</div>
      {task.labels?.length ? <div className="task-card__labels" aria-label={t("task.labelsLabel")}>{task.labels.map((label) => <span key={label.id} style={{ "--label-color": label.color }}>{label.name}</span>)}</div> : null}
      <div className="task-card__assignment"><span className={task.assignee ? "assignee-avatar" : "assignee-avatar assignee-avatar--empty"} aria-hidden="true">{task.assignee?.name?.charAt(0).toUpperCase() || "–"}</span><span>{task.assignee?.name || t("task.unassigned")}</span></div>
      {(task.recurrence && task.recurrence !== "NONE") || task.estimatedMinutes || task.actualMinutes ? <div className="task-card__schedule" aria-label={t("task.scheduleLabel")}>{task.recurrence && task.recurrence !== "NONE" ? <span>↻ {t(`task.recurrence.${task.recurrence}`)}</span> : null}{task.estimatedMinutes ? <span>{t("task.estimate", { time: formatMinutes(task.estimatedMinutes) })}</span> : null}{task.actualMinutes ? <span>{t("task.spent", { time: formatMinutes(task.actualMinutes) })}</span> : null}</div> : null}
      <footer><span className={isOverdue ? "task-due--overdue" : ""}>{task.dueDate ? t(isOverdue ? "task.overdueOn" : "task.dueOn", { date: dateFormatter.format(new Date(task.dueDate)) }) : t("task.noDueDate")}</span><div className="task-card__controls"><label className="task-status-control"><span className="visually-hidden">{t("task.changeStatus", { title: task.title })}</span><select aria-label={t("task.changeStatus", { title: task.title })} disabled={isMoving} onChange={(event) => onStatusChange(task, event.target.value)} value={task.status}>{statuses.map((status) => <option key={status} value={status}>{t(`task.status.${status}`)}</option>)}</select></label><div className="task-card__actions"><button onClick={() => onOpenDetails(task)} type="button">{t("common.details")}</button><button onClick={() => onEdit(task)} type="button">{t("common.edit")}</button><button className="project-delete" onClick={() => onDelete(task)} type="button">{t("common.delete")}</button></div></div></footer>
      <span className="visually-hidden">{t("task.currentStatus", { status: statusLabel })}</span>
    </article>
  );
}
