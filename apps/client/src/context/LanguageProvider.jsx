import { useCallback, useEffect, useMemo, useState } from "react";
import { localeFor, translate } from "../i18n/translations.js";
import { useAuth } from "./auth-context.js";
import { LanguageContext } from "./language-context.js";

const LANGUAGE_STORAGE_KEY = "ordanly.language.v1";

function normalizeLanguage(value) {
  return String(value ?? "").toLowerCase() === "de" ? "de" : "en";
}

function readGuestLanguage() {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage === "de" || storedLanguage === "en") return storedLanguage;
  } catch {
    // Browser storage can be unavailable. The language still works for this visit.
  }

  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function LanguageProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [guestLanguage, setGuestLanguage] = useState(readGuestLanguage);
  const language = user?.language
    ? normalizeLanguage(user.language)
    : guestLanguage;

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The document language still updates when storage is unavailable.
    }
  }, [language]);

  const t = useCallback(
    (key, variables) => translate(language, key, variables),
    [language],
  );

  const setLanguage = useCallback(
    async (nextLanguage) => {
      const normalized = normalizeLanguage(nextLanguage);

      if (!user) {
        setGuestLanguage(normalized);
      } else if (normalizeLanguage(user.language) !== normalized) {
        await updateProfile({ language: normalized.toUpperCase() });
      }
    },
    [updateProfile, user],
  );

  const value = useMemo(
    () => ({ language, locale: localeFor(language), setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
