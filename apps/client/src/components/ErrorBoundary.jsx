import { BrandLogo } from "./BrandLogo.jsx";
import { Component } from "react";
import { translate } from "../i18n/translations.js";

// The boundary sits outside the language provider, so it reads the stored
// language directly.
function storedLanguage() {
  try {
    return window.localStorage.getItem("ordanly.language.v1") === "de" ? "de" : "en";
  } catch {
    return "en";
  }
}

export class ErrorBoundary extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled React error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const language = storedLanguage();
      const t = (key) => translate(language, key);

      return (
        <main className="project-error-page">
          <a className="brand" href="/">
            <BrandLogo />
          </a>

          <div className="content-error" role="alert">
            <p className="eyebrow eyebrow--danger">{t("errorBoundary.eyebrow")}</p>
            <h1>{t("errorBoundary.title")}</h1>
            <p>{t("errorBoundary.copy")}</p>

            <button
              className="button button--dark"
              onClick={() => window.location.reload()}
              type="button"
            >
              {t("errorBoundary.reload")}
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
