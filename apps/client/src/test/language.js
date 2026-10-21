import { vi } from "vitest";
import { localeFor, translate } from "../i18n/translations.js";

export function createLanguageValue(language = "en") {
  return {
    language,
    locale: localeFor(language),
    setLanguage: vi.fn().mockResolvedValue(undefined),
    t: (key, variables) => translate(language, key, variables),
  };
}
