import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { useAuth } from "../context/auth-context.js";
import { getSafeAuthDestination } from "../lib/auth-navigation.js";

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: location.state?.email ?? "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to={getSafeAuthDestination(location)} replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const destination = getSafeAuthDestination(location);
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to Ordanly"
      description="Continue where you left off."
      footer={
        <p>
          New to Ordanly? <Link state={location.state} to="/register">Create an account</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="form-message form-message--error" role="alert">
            {errorMessage}
          </div>
        )}

        <label className="form-field">
          <span>Email address</span>
          <input
            autoComplete="email"
            name="email"
            onChange={handleChange}
            placeholder="you@example.com"
            required
            type="email"
            value={form.email}
          />
        </label>

        <label className="form-field">
          <span>Password</span>
          <div className="password-field">
            <input
              autoComplete="current-password"
              name="password"
              onChange={handleChange}
              required
              type={showPassword ? "text" : "password"}
              value={form.password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <div className="auth-link-row">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button
          className="button button--dark button--full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
