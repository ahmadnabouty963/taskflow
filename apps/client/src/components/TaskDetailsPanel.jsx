import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { TaskAttachments } from "./TaskAttachments.jsx";

function formatMinutes(minutes, t) {
  if (!minutes) return t("taskDetails.notRecorded");
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : "", rest ? `${rest}m` : ""].filter(Boolean).join(" ");
}

export function TaskDetailsPanel({ projectId, task, onClose }) {
  const { locale, t } = useLanguage();
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const [details, setDetails] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [workingId, setWorkingId] = useState("");

  const basePath = `/api/projects/${projectId}/tasks/${task.id}`;

  useEffect(() => {
    const controller = new AbortController();

    apiRequest(basePath, { signal: controller.signal })
      .then((result) => {
        setDetails(result.data.task);
        setStatus("success");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [basePath]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const completedSubtasks = useMemo(
    () => details?.subtasks.filter((subtask) => subtask.completed).length ?? 0,
    [details],
  );
  const subtaskPercentage = details?.subtasks.length
    ? Math.round((completedSubtasks / details.subtasks.length) * 100)
    : 0;

  async function addSubtask(event) {
    event.preventDefault();
    const title = subtaskTitle.trim();
    if (!title) return;
    setWorkingId("new-subtask");
    setError("");
    try {
      const result = await apiRequest(`${basePath}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setDetails((current) => ({
        ...current,
        subtasks: [...current.subtasks, result.data.subtask],
      }));
      setSubtaskTitle("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  async function toggleSubtask(subtask) {
    setWorkingId(subtask.id);
    setError("");
    try {
      const result = await apiRequest(`${basePath}/subtasks/${subtask.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !subtask.completed }),
      });
      setDetails((current) => ({
        ...current,
        subtasks: current.subtasks.map((item) =>
          item.id === subtask.id ? result.data.subtask : item,
        ),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  async function deleteSubtask(subtaskId) {
    setWorkingId(subtaskId);
    setError("");
    try {
      await apiRequest(`${basePath}/subtasks/${subtaskId}`, {
        method: "DELETE",
      });
      setDetails((current) => ({
        ...current,
        subtasks: current.subtasks.filter((item) => item.id !== subtaskId),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  async function addComment(event) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    setWorkingId("new-comment");
    setError("");
    try {
      const result = await apiRequest(`${basePath}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDetails((current) => ({
        ...current,
        comments: [result.data.comment, ...current.comments],
      }));
      setCommentBody("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  async function deleteComment(commentId) {
    setWorkingId(commentId);
    setError("");
    try {
      await apiRequest(`${basePath}/comments/${commentId}`, {
        method: "DELETE",
      });
      setDetails((current) => ({
        ...current,
        comments: current.comments.filter((comment) => comment.id !== commentId),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div className="task-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside aria-labelledby="task-detail-title" aria-modal="true" className="task-detail-panel" role="dialog">
        <header className="task-detail-header">
          <div><p className="eyebrow">{t("taskDetails.eyebrow")}</p><h2 id="task-detail-title">{task.title}</h2></div>
          <button aria-label={t("taskDetails.close")} className="dialog-close" onClick={onClose} type="button">×</button>
        </header>

        {status === "loading" && <div className="task-detail-loading">{t("taskDetails.loading")}</div>}
        {error && <div className="form-message form-message--error" role="alert">{error}</div>}

        {status === "success" && details && (
          <div className="task-detail-content">
            <section className="task-detail-summary">
              <div><span className={`priority-badge priority-badge--${details.priority.toLowerCase()}`}>{t(`task.priority.${details.priority}`)}</span><span>{t(`task.status.${details.status}`)}</span></div>
              <p>{details.description || t("taskDetails.noDescription")}</p>
              <div className="task-detail-meta">
                <div><span>{t("taskDetails.responsible")}</span><strong>{details.assignee?.name || t("task.unassigned")}</strong></div>
                <div><span>{t("taskDialog.dueDate")}</span><strong>{details.dueDate ? new Date(details.dueDate).toLocaleDateString(locale) : t("taskDetails.none")}</strong></div>
                <div><span>{t("taskDialog.repeat")}</span><strong>{t(`task.recurrence.${details.recurrence ?? "NONE"}`)}</strong></div>
                <div><span>{t("taskDetails.estimated")}</span><strong>{formatMinutes(details.estimatedMinutes, t)}</strong></div>
                <div><span>{t("taskDetails.spent")}</span><strong>{formatMinutes(details.actualMinutes, t)}</strong></div>
              </div>
              {details.labels?.length ? <div className="task-card__labels task-detail-labels" aria-label={t("task.labelsLabel")}>{details.labels.map((label) => <span key={label.id} style={{ "--label-color": label.color }}>{label.name}</span>)}</div> : null}
            </section>

            <TaskAttachments basePath={basePath} />

            <section className="task-detail-section">
              <div className="task-detail-section__heading">
                <div><h3>{t("taskDetails.subtasks")}</h3><span>{completedSubtasks}/{details.subtasks.length}</span></div>
                <strong>{subtaskPercentage}%</strong>
              </div>
              <div className="subtask-progress" aria-label={t("taskDetails.subtaskProgress")} aria-valuemin="0" aria-valuemax="100" aria-valuenow={subtaskPercentage} role="progressbar"><span style={{ width: `${subtaskPercentage}%` }} /></div>

              <form className="inline-create-form" onSubmit={addSubtask}>
                <input aria-label={t("taskDetails.newSubtask")} maxLength="200" onChange={(event) => setSubtaskTitle(event.target.value)} placeholder={t("taskDetails.subtaskPlaceholder")} value={subtaskTitle} />
                <button disabled={workingId === "new-subtask" || !subtaskTitle.trim()} type="submit">{t("taskDetails.add")}</button>
              </form>

              {details.subtasks.length === 0 ? <p className="task-detail-empty">{t("taskDetails.noSubtasks")}</p> : (
                <ul className="subtask-list">
                  {details.subtasks.map((subtask) => (
                    <li key={subtask.id}>
                      <label><input checked={subtask.completed} disabled={workingId === subtask.id} onChange={() => toggleSubtask(subtask)} type="checkbox" /><span>{subtask.title}</span></label>
                      <button aria-label={t("taskDetails.deleteSubtask", { title: subtask.title })} disabled={workingId === subtask.id} onClick={() => deleteSubtask(subtask.id)} type="button">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="task-detail-section">
              <div className="task-detail-section__heading"><div><h3>{t("taskDetails.comments")}</h3><span>{details.comments.length}</span></div></div>
              <form className="comment-form" onSubmit={addComment}>
                <textarea aria-label={t("taskDetails.newComment")} maxLength="2000" onChange={(event) => setCommentBody(event.target.value)} placeholder={t("taskDetails.commentPlaceholder")} rows="3" value={commentBody} />
                <button className="button button--dark" disabled={workingId === "new-comment" || !commentBody.trim()} type="submit">{t("taskDetails.addComment")}</button>
              </form>

              {details.comments.length === 0 ? <p className="task-detail-empty">{t("taskDetails.noComments")}</p> : (
                <ul className="comment-list">
                  {details.comments.map((comment) => (
                    <li key={comment.id}>
                      <div className="comment-avatar" aria-hidden="true">{comment.author.name.charAt(0).toUpperCase()}</div>
                      <div><header><strong>{comment.author.name}</strong><time dateTime={comment.createdAt}>{dateTimeFormatter.format(new Date(comment.createdAt))}</time></header><p>{comment.body}</p></div>
                      <button aria-label={t("taskDetails.deleteComment")} disabled={workingId === comment.id} onClick={() => deleteComment(comment.id)} type="button">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
