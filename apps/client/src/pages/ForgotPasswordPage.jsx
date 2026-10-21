import { useState } from "react";
import { Link } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";

export function ForgotPasswordPage() {
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
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email and we will send a private reset link."
      footer={<p>Remembered it? <Link to="/login">Back to login</Link></p>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="form-message form-message--error" role="alert">{error}</div> : null}
        {message ? <div className="form-message" role="status">{message}</div> : null}
        <label className="form-field">
          <span>Email address</span>
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
