import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { ForgotPasswordPage } from "./ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./ResetPasswordPage.jsx";
import { VerifyEmailPage } from "./VerifyEmailPage.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("Email verification and password recovery pages", () => {
  it("requests a reset link without exposing account existence", async () => {
    apiRequest.mockResolvedValue({
      data: { message: "If an account exists for this address, a reset link has been sent." },
    });
    const user = userEvent.setup();
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await user.type(screen.getByLabelText(/email address/i), "AHMAD@EXAMPLE.COM");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(apiRequest).toHaveBeenCalledWith("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "ahmad@example.com" }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent("If an account exists");
  });

  it("verifies the token from the URL", async () => {
    apiRequest.mockResolvedValue({ data: {} });
    render(
      <MemoryRouter initialEntries={["/verify-email/private-verification-token-12345"]}>
        <Routes>
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      "/api/auth/verify-email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "private-verification-token-12345" }),
      }),
    ));
    expect(await screen.findByText(/email is confirmed/i)).toBeInTheDocument();
  });

  it("does not reset when the new passwords differ", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/reset-password/private-reset-token-123456789"]}>
        <Routes>
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText(/^new password$/i), "StrongPass123");
    await user.type(screen.getByLabelText(/confirm new password/i), "DifferentPass123");
    await user.click(screen.getByRole("button", { name: /change password/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
