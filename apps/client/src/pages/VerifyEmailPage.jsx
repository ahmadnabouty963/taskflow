import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { apiRequest } from "../lib/api.js";

export function VerifyEmailPage() {
  const { token } = useParams();
  const [result, setResult] = useState({ status: "loading", message: "Confirming your email address..." });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(() => {
        if (!controller.signal.aborted) {
          setResult({ status: "success", message: "Your email is confirmed. You can now log in." });
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setResult({ status: "error", message: error.message });
        }
      });
    return () => controller.abort();
  }, [token]);

  return (
    <AuthLayout
      eyebrow="Account security"
      title={result.status === "success" ? "Email confirmed" : "Confirming email"}
      description="This private link can be used only once."
      footer={<p>Need another link? <Link to="/check-email">Request one</Link></p>}
    >
      <div className={`auth-status-card auth-status-card--${result.status}`} role={result.status === "error" ? "alert" : "status"}>
        <span aria-hidden="true" className="auth-status-icon">
          {result.status === "success" ? "✓" : result.status === "error" ? "!" : "…"}
        </span>
        <p>{result.message}</p>
      </div>
      {result.status === "success" ? <Link className="button button--dark button--full" to="/login">Continue to login</Link> : null}
    </AuthLayout>
  );
}
