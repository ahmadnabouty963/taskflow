import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { formatFileSize, uploadFile } from "../lib/uploads.js";

export function TaskAttachments({ basePath }) {
  const { locale, t } = useLanguage();
  const [attachments, setAttachments] = useState([]);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [limits, setLimits] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const path = `${basePath}/attachments`;

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(path, { signal: controller.signal })
      .then((result) => {
        setAttachments(result.data.attachments);
        setUploadsEnabled(result.data.uploadsEnabled);
        setLimits(result.data.limits);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setStatus("error");
        }
      });
    return () => controller.abort();
  }, [path]);

  function validationError(file) {
    if (!limits.contentTypes.includes(file.type)) return t("attachments.typeNotAllowed", { name: file.name });
    if (file.size > limits.maxBytes) {
      return t("attachments.tooLarge", { name: file.name, size: formatFileSize(limits.maxBytes, locale) });
    }
    return "";
  }

  async function handleFiles(fileList) {
    setError("");
    for (const file of Array.from(fileList)) {
      const problem = validationError(file);
      if (problem) {
        setError(problem);
        continue;
      }

      const uploadId = `${file.name}-${file.size}-${Date.now()}`;
      setUploads((current) => [...current, { id: uploadId, name: file.name, progress: 0 }]);
      try {
        const attachment = await uploadFile({
          requestPath: path,
          file,
          onProgress: (progress) =>
            setUploads((current) => current.map((item) => (item.id === uploadId ? { ...item, progress } : item))),
        });
        setAttachments((current) => [attachment, ...current]);
      } catch (uploadError) {
        setError(t("attachments.uploadFailed", { name: file.name, message: uploadError.message }));
      } finally {
        setUploads((current) => current.filter((item) => item.id !== uploadId));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirmDelete() {
    const attachment = pendingDelete;
    setPendingDelete(null);
    setError("");
    try {
      await apiRequest(`/api/attachments/${attachment.id}`, { method: "DELETE" });
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (uploadsEnabled && event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
  }

  return (
    <section
      aria-label={t("attachments.title")}
      className={"task-detail-section task-attachments" + (isDragging ? " task-attachments--dragging" : "")}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        if (!uploadsEnabled) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={handleDrop}
    >
      <div className="task-detail-section__heading">
        <div><h3>{t("attachments.title")}</h3><span>{attachments.length}</span></div>
        {uploadsEnabled && (
          <label className="button button--ghost task-attachments__add">
            {t("attachments.add")}
            <input
              accept={limits?.contentTypes.join(",")}
              className="visually-hidden"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              ref={inputRef}
              type="file"
            />
          </label>
        )}
      </div>

      {uploadsEnabled && <p className="task-attachments__hint">{t("attachments.hint", { size: formatFileSize(limits.maxBytes, locale) })}</p>}
      {status === "loading" && <p className="task-detail-empty">{t("attachments.loading")}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}

      {uploads.map((upload) => (
        <div className="task-attachments__progress" key={upload.id}>
          <span>{t("attachments.uploading", { name: upload.name })}</span>
          <div aria-label={t("attachments.uploading", { name: upload.name })} aria-valuemax="100" aria-valuemin="0" aria-valuenow={upload.progress} className="subtask-progress" role="progressbar">
            <span style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      ))}

      {status === "ready" && attachments.length === 0 && uploads.length === 0 && (
        <p className="task-detail-empty">{t("attachments.empty")}</p>
      )}

      {attachments.length > 0 && (
        <ul className="task-attachments__list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <a className="task-attachments__file" href={attachment.downloadUrl} rel="noopener noreferrer" target="_blank">
                {attachment.isImage ? (
                  <img alt="" className="task-attachments__thumb" loading="lazy" src={attachment.url} />
                ) : (
                  <span aria-hidden="true" className="task-attachments__icon">{attachment.fileName.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span>
                )}
                <span className="task-attachments__meta">
                  <strong>{attachment.fileName}</strong>
                  <small>{formatFileSize(attachment.size, locale)}{attachment.uploadedBy ? ` · ${attachment.uploadedBy.name}` : ""}</small>
                </span>
              </a>
              {attachment.canDelete && (
                pendingDelete?.id === attachment.id ? (
                  <span className="task-attachments__confirm">
                    <button className="text-action--danger" onClick={confirmDelete} type="button">{t("common.delete")}</button>
                    <button onClick={() => setPendingDelete(null)} type="button">{t("common.cancel")}</button>
                  </span>
                ) : (
                  <button aria-label={t("attachments.delete", { name: attachment.fileName })} onClick={() => setPendingDelete(attachment)} type="button">×</button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
