import { useState } from "react";
import { Link, useLocation } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";
import { useLanguage } from "../context/language-context.js";

export function CheckEmailPage() {
  const location = useLocation();
  const { t } = useLanguage();
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [message, setMessage] = useState(
    t("checkEmail.initial"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResend(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await apiRequest("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setMessage(result.data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={t("checkEmail.eyebrow")}
      title={t("checkEmail.title")}
      description={t("checkEmail.description")}
      footer={<p>{t("checkEmail.confirmed")} <Link state={location.state} to="/login">{t("common.login")}</Link></p>}
    >
      <div className="auth-status-card" role="status">
        <span aria-hidden="true" className="auth-status-icon">@</span>
        <p>{message}</p>
      </div>
      <form className="auth-form" onSubmit={handleResend}>
        <label className="form-field">
          <span>{t("common.email")}</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="button button--ghost button--full" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("checkEmail.sending") : t("checkEmail.resend")}
        </button>
      </form>
    </AuthLayout>
  );
}
