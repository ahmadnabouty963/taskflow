import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";

// Fonts are copied to public/ at build time, so nothing loads from a CDN.
window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

const AUTOSAVE_DELAY_MS = 4000;
const unsupportedTypes = new Set(["image", "embeddable", "iframe"]);

function savableElements(elements) {
  return elements.filter(
    (element) => !element.isDeleted && !unsupportedTypes.has(element.type),
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
      .then((result) => {
        const { whiteboard } = result.data;
        versionRef.current = whiteboard.version;
        savedSignatureRef.current = signature(whiteboard.elements);
        conflictRef.current = false;
        setInitialData({ elements: whiteboard.elements, scrollToContent: true });
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

  function handleChange(elements) {
    if (!canEdit || conflictRef.current) return;
    const nextElements = savableElements(elements);
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
      <p className="whiteboard__hint">{t("whiteboard.imagesHint")}</p>
      <div className="whiteboard__canvas" lang={locale}>
        <Excalidraw
          initialData={initialData}
          key={reloadKey}
          langCode={language === "de" ? "de-DE" : "en"}
          onChange={handleChange}
          theme={theme === "dark" ? "dark" : "light"}
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false },
            tools: { image: false },
          }}
          viewModeEnabled={!canEdit}
        />
      </div>
    </section>
  );
}
