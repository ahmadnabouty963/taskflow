import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";
import { useLanguage } from "../context/language-context.js";

export function VerifyEmailPage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [result, setResult] = useState({ status: "loading", message: t("verify.loading") });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(() => {
        if (!controller.signal.aborted) {
          setResult({ status: "success", message: t("verify.success") });
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setResult({ status: "error", message: error.message });
        }
      });
    return () => controller.abort();
  }, [t, token]);

  return (
    <AuthLayout
      eyebrow={t("verify.eyebrow")}
      title={result.status === "success" ? t("verify.successTitle") : t("verify.loadingTitle")}
      description={t("verify.description")}
      footer={<p>{t("verify.another")} <Link to="/check-email">{t("verify.request")}</Link></p>}
    >
      <div className={`auth-status-card auth-status-card--${result.status}`} role={result.status === "error" ? "alert" : "status"}>
        <span aria-hidden="true" className="auth-status-icon">
          {result.status === "success" ? "✓" : result.status === "error" ? "!" : "…"}
        </span>
        <p>{result.message}</p>
      </div>
      {result.status === "success" ? <Link className="button button--dark button--full" to="/login">{t("verify.continue")}</Link> : null}
    </AuthLayout>
  );
}
