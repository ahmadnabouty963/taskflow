import { useState } from "react";
import { Link, useParams } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";

export function ResetPasswordPage() {
  const { token } = useParams();
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: form.password }),
      });
      setMessage("Your password has been changed. All previous sessions were signed out.");
      setForm({ password: "", confirmation: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Choose a new password"
      description="The reset link expires after 60 minutes and can be used once."
      footer={<p><Link to="/login">Back to login</Link></p>}
    >
      {message ? (
        <div className="auth-recovery-success">
          <div className="auth-status-card auth-status-card--success" role="status">
            <span aria-hidden="true" className="auth-status-icon">✓</span>
            <p>{message}</p>
          </div>
          <Link className="button button--dark button--full" to="/login">Log in with new password</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}
          <label className="form-field">
            <span>New password</span>
            <input autoComplete="new-password" minLength="8" name="password" onChange={handleChange} required type="password" value={form.password} />
          </label>
          <label className="form-field">
            <span>Confirm new password</span>
            <input autoComplete="new-password" minLength="8" name="confirmation" onChange={handleChange} required type="password" value={form.confirmation} />
          </label>
          <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Changing password..." : "Change password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
