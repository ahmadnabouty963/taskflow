import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { useAuth } from "../context/auth-context.js";
import { getSafeAuthDestination } from "../lib/auth-navigation.js";

export function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: location.state?.email ?? "",
    password: "",
    confirmPassword: "",
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

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      navigate("/check-email", {
        replace: true,
        state: { ...location.state, email: form.email.trim().toLowerCase() },
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Start with clarity"
      title="Create your account"
      description="Set up your personal workspace in less than a minute."
      footer={
        <p>
          Already have an account? <Link state={location.state} to="/login">Log in</Link>
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
          <span>Full name</span>
          <input
            autoComplete="name"
            maxLength="80"
            minLength="2"
            name="name"
            onChange={handleChange}
            placeholder="Your name"
            required
            type="text"
            value={form.name}
          />
        </label>

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
              autoComplete="new-password"
              maxLength="72"
              minLength="8"
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
          <small>Use at least 8 characters.</small>
        </label>

        <label className="form-field">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            maxLength="72"
            minLength="8"
            name="confirmPassword"
            onChange={handleChange}
            required
            type={showPassword ? "text" : "password"}
            value={form.confirmPassword}
          />
        </label>

        <button
          className="button button--dark button--full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
