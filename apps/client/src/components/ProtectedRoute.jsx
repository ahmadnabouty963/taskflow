import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/auth-context.js";

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="loading-screen" aria-live="polite">
        <div className="loading-mark">O</div>
        <p>Loading your workspace...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  return children;
}
