import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { ProtectedRoute } from "./ProtectedRoute.jsx";

function LoginDestination() {
  const location = useLocation();

  return <p>Redirected from {location.state?.from}</p>;
}

function renderProtectedRoute(authValue, initialPath = "/app") {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginDestination />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <p>Private workspace</p>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/projects/:projectId"
            element={
              <ProtectedRoute>
                <p>Private project</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading state while authentication is checked", () => {
    renderProtectedRoute({
      user: null,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    expect(screen.getByText("Loading your workspace...")).toBeInTheDocument();
  });

  it("redirects guests and preserves their destination", () => {
    renderProtectedRoute(
      {
        user: null,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      },
      "/app/projects/example?status=TODO",
    );

    expect(
      screen.getByText("Redirected from /app/projects/example?status=TODO"),
    ).toBeInTheDocument();
  });

  it("shows protected content for an authenticated user", () => {
    renderProtectedRoute({
      user: {
        id: "user-1",
        name: "Ahmad",
        email: "ahmad@example.com",
      },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    expect(screen.getByText("Private workspace")).toBeInTheDocument();
  });
});
