import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { uploadFile } from "../lib/uploads.js";

// Fonts are copied to public/ at build time, so nothing loads from a CDN.
window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

const AUTOSAVE_DELAY_MS = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const embedTypes = new Set(["embeddable", "iframe"]);

// Images are only kept when uploads work; otherwise they could not be stored.
function savableElements(elements, allowImages) {
  return elements.filter(
    (element) =>
      !element.isDeleted &&
      !embedTypes.has(element.type) &&
      (allowImages || element.type !== "image"),
  );
}

async function toDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function loadFiles(files) {
  const results = await Promise.allSettled(
    files.map(async (file) => ({
      id: file.fileId,
      mimeType: file.mimeType,
      dataURL: await toDataUrl(file.url),
      created: Date.now(),
    })),
  );
  return Object.fromEntries(
    results.filter((result) => result.status === "fulfilled").map(({ value }) => [value.id, value]),
  );
}

// Cheap change detection: Excalidraw bumps an element's version on every edit.
function signature(elements) {
  return elements.map((element) => `${element.id}:${element.version}`).join("|");
}

function useDocumentTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme || "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export default function WhiteboardView({ projectId }) {
  const { language, locale, t } = useLanguage();
  const theme = useDocumentTheme();
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [initialData, setInitialData] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [saveError, setSaveError] = useState("");
  const [updatedBy, setUpdatedBy] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [imageError, setImageError] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  const storedFileIdsRef = useRef(new Set());
  const uploadingFileIdsRef = useRef(new Set());

  const versionRef = useRef(0);
  const savedSignatureRef = useRef("");
  const pendingElementsRef = useRef(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const conflictRef = useRef(false);
  const saveRef = useRef(null);

  const path = `/api/projects/${projectId}/whiteboard`;

  useEffect(() => {
    const controller = new AbortController();

    apiRequest(path, { signal: controller.signal })
      .then(async (result) => {
        const files = result.data.files ?? [];
        const loadedFiles = await loadFiles(files);
        if (controller.signal.aborted) return;
        storedFileIdsRef.current = new Set(files.map(({ fileId }) => fileId));
        setUploadsEnabled(Boolean(result.data.uploadsEnabled));
        const { whiteboard } = result.data;
        versionRef.current = whiteboard.version;
        savedSignatureRef.current = signature(whiteboard.elements);
        conflictRef.current = false;
        setInitialData({ elements: whiteboard.elements, files: loadedFiles, scrollToContent: true });
        setCanEdit(result.data.canEdit);
        setUpdatedBy(whiteboard.updatedBy);
        setSaveState("saved");
        setSaveError("");
        setStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoadError(error.message);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [path, reloadKey]);

  function reload() {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  function scheduleSave() {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => saveRef.current?.(), AUTOSAVE_DELAY_MS);
  }

  const save = useCallback(async () => {
    window.clearTimeout(timerRef.current);
    const elements = pendingElementsRef.current;
    if (!elements || savingRef.current || conflictRef.current) return;

    savingRef.current = true;
    pendingElementsRef.current = null;
    setSaveState("saving");
    setSaveError("");

    try {
      const result = await apiRequest(path, {
        method: "PUT",
        body: JSON.stringify({ elements, baseVersion: versionRef.current }),
      });
      versionRef.current = result.data.whiteboard.version;
      savedSignatureRef.current = signature(elements);
      // Excalidraw may report the same scene again while the request runs.
      if (
        pendingElementsRef.current &&
        signature(pendingElementsRef.current) === savedSignatureRef.current
      ) {
        pendingElementsRef.current = null;
      }
      setUpdatedBy(result.data.whiteboard.updatedBy);
      setSaveState(pendingElementsRef.current ? "unsaved" : "saved");
    } catch (error) {
      if (error.code === "WHITEBOARD_CONFLICT") {
        conflictRef.current = true;
        setSaveState("conflict");
        return;
      }
      pendingElementsRef.current ??= elements;
      setSaveError(error.message);
      setSaveState("error");
    } finally {
      savingRef.current = false;
    }

    if (pendingElementsRef.current) scheduleSave();
  }, [path]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  async function uploadImage(fileId, file) {
    uploadingFileIdsRef.current.add(fileId);
    setUploadingCount((count) => count + 1);
    setImageError("");
    try {
      const blob = await (await fetch(file.dataURL)).blob();
      if (blob.size > MAX_IMAGE_BYTES) throw new Error(t("whiteboard.imageTooLarge"));
      const extension = file.mimeType.split("/")[1] ?? "png";
      await uploadFile({
        requestPath: `${path}/files`,
        file: new File([blob], `whiteboard-image.${extension}`, { type: file.mimeType }),
        extra: { fileId },
      });
      storedFileIdsRef.current.add(fileId);
    } catch (error) {
      if (error.code === "WHITEBOARD_FILE_EXISTS") storedFileIdsRef.current.add(fileId);
      else setImageError(t("whiteboard.imageFailed", { message: error.message }));
    } finally {
      uploadingFileIdsRef.current.delete(fileId);
      setUploadingCount((count) => count - 1);
    }
  }

  function handleChange(elements, appState, files = {}) {
    if (!canEdit || conflictRef.current) return;
    if (uploadsEnabled) {
      for (const element of elements) {
        const file = element.type === "image" && !element.isDeleted ? files[element.fileId] : null;
        if (file?.dataURL && !storedFileIdsRef.current.has(element.fileId) && !uploadingFileIdsRef.current.has(element.fileId)) {
          uploadImage(element.fileId, file);
        }
      }
    }
    const nextElements = savableElements(elements, uploadsEnabled);
    if (signature(nextElements) === savedSignatureRef.current) return;

    pendingElementsRef.current = nextElements;
    setSaveState("unsaved");
    scheduleSave();
  }

  // Save open changes when the user leaves the whiteboard inside the app,
  // and warn before closing the browser tab with unsaved drawings.
  useEffect(() => {
    function warnBeforeUnload(event) {
      if (pendingElementsRef.current || savingRef.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (pendingElementsRef.current) save();
    };
  }, [save]);

  if (status === "loading") {
    return <div className="board-loading" aria-live="polite">{t("whiteboard.loading")}</div>;
  }

  if (status === "error") {
    return (
      <div className="content-error" role="alert">
        <h2>{t("whiteboard.loadError")}</h2>
        <p>{loadError}</p>
        <button className="button button--ghost" onClick={reload} type="button">
          {t("common.tryAgain")}
        </button>
      </div>
    );
  }

  const statusText = {
    saved: updatedBy
      ? t("whiteboard.savedBy", { name: updatedBy.name })
      : t("whiteboard.saved"),
    unsaved: t("whiteboard.unsaved"),
    saving: t("whiteboard.saving"),
    error: t("whiteboard.errorStatus", { message: saveError }),
    conflict: t("whiteboard.conflict"),
  }[saveState];

  return (
    <section aria-label={t("whiteboard.label")} className="whiteboard">
      <div className="whiteboard__bar">
        <p className={`whiteboard__status whiteboard__status--${saveState}`} role="status">
          {canEdit ? statusText : t("whiteboard.readOnly")}
        </p>
        <div className="whiteboard__actions">
          {saveState === "conflict" && (
            <button className="button button--dark" onClick={reload} type="button">
              {t("whiteboard.loadLatest")}
            </button>
          )}
          {canEdit && (saveState === "unsaved" || saveState === "error") && (
            <button className="button button--ghost" onClick={save} type="button">
              {t("whiteboard.saveNow")}
            </button>
          )}
        </div>
      </div>
      {!uploadsEnabled && canEdit && <p className="whiteboard__hint">{t("whiteboard.imagesHint")}</p>}
      {uploadingCount > 0 && <p className="whiteboard__hint" role="status">{t("whiteboard.imageUploading")}</p>}
      {imageError && <p className="field-error" role="alert">{imageError}</p>}
      <div className="whiteboard__canvas" lang={locale}>
        <Excalidraw
          initialData={initialData}
          key={reloadKey}
          langCode={language === "de" ? "de-DE" : "en"}
          onChange={handleChange}
          theme={theme === "dark" ? "dark" : "light"}
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false },
            tools: { image: uploadsEnabled },
          }}
          viewModeEnabled={!canEdit}
        />
      </div>
    </section>
  );
}
