import { createContext, useContext } from "react";
import { localeFor, translate } from "../i18n/translations.js";

export const LanguageContext = createContext(null);

// Components rendered outside the provider (isolated tests, error screens)
// fall back to English instead of crashing.
const fallbackLanguage = {
  language: "en",
  locale: localeFor("en"),
  setLanguage: async () => {},
  t: (key, variables) => translate("en", key, variables),
};

export function useLanguage() {
  return useContext(LanguageContext) ?? fallbackLanguage;
}
