import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { LoginPage } from "./LoginPage.jsx";
import { RegisterPage } from "./RegisterPage.jsx";

function renderWithAuth(component, overrides = {}) {
  const authValue = {
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };

  return {
    authValue,
    user: userEvent.setup(),
    ...render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>{component}</MemoryRouter>
      </AuthContext.Provider>,
    ),
  };
}

describe("Authentication pages", () => {
  it("submits normalized login credentials", async () => {
    const { user, authValue } = renderWithAuth(<LoginPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "AHMAD@EXAMPLE.COM",
    );
    await user.type(
      screen.getByLabelText(/^password/i, { selector: "input" }),
      "StrongPass123",
    );
    await user.click(screen.getByRole("button", { name: /^log in$/i }));

    await waitFor(() => {
      expect(authValue.login).toHaveBeenCalledWith({
        email: "ahmad@example.com",
        password: "StrongPass123",
      });
    });
  });

  it("does not register when passwords are different", async () => {
    const { user, authValue } = renderWithAuth(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), "Ahmad Nabouty");
    await user.type(
      screen.getByLabelText(/email address/i),
      "ahmad@example.com",
    );
    await user.type(
      screen.getByLabelText(/^password/i, { selector: "input" }),
      "StrongPass123",
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "DifferentPass123",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );

    expect(authValue.register).not.toHaveBeenCalled();
  });
});
