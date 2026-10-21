import { useState } from "react";
import { Link, useLocation } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";

export function CheckEmailPage() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [message, setMessage] = useState(
    "We sent a private confirmation link. It remains valid for 24 hours.",
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
      eyebrow="One last step"
      title="Check your inbox"
      description="Confirm your email before logging in to your workspace."
      footer={<p>Already confirmed? <Link state={location.state} to="/login">Log in</Link></p>}
    >
      <div className="auth-status-card" role="status">
        <span aria-hidden="true" className="auth-status-icon">@</span>
        <p>{message}</p>
      </div>
      <form className="auth-form" onSubmit={handleResend}>
        <label className="form-field">
          <span>Email address</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="button button--ghost button--full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send a new confirmation link"}
        </button>
      </form>
    </AuthLayout>
  );
}
