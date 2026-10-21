import { useState } from "react";
import { useLanguage } from "../context/language-context.js";

export function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function selectLanguage(nextLanguage) {
    if (nextLanguage === language || isSaving) return;
    setError("");
    setIsSaving(true);
    try {
      await setLanguage(nextLanguage);
    } catch {
      setError(t("language.error"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="language-switcher-wrapper">
      <div
        aria-label={t("language.switch")}
        className={compact ? "language-switcher language-switcher--compact" : "language-switcher"}
        role="group"
      >
        <button
          aria-pressed={language === "en"}
          disabled={isSaving}
          onClick={() => selectLanguage("en")}
          type="button"
        >
          EN<span className="visually-hidden"> — {t("language.english")}</span>
        </button>
        <button
          aria-pressed={language === "de"}
          disabled={isSaving}
          onClick={() => selectLanguage("de")}
          type="button"
        >
          DE<span className="visually-hidden"> — {t("language.german")}</span>
        </button>
      </div>
      {error ? <span className="language-switcher__error" role="alert">{error}</span> : null}
    </div>
  );
}
