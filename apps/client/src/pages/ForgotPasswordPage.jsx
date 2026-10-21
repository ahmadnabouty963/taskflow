import { useState } from "react";
import { Link } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";
import { useLanguage } from "../context/language-context.js";

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setMessage(result.data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={t("forgot.eyebrow")}
      title={t("forgot.title")}
      description={t("forgot.description")}
      footer={<p>{t("forgot.remembered")} <Link to="/login">{t("common.backLogin")}</Link></p>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}
        {message ? <div className="form-message" role="status">{message}</div> : null}
        <label className="form-field">
          <span>{t("common.email")}</span>
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("forgot.sending") : t("forgot.submit")}
        </button>
      </form>
    </AuthLayout>
  );
}
