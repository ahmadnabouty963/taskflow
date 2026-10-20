import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";
import { InvitationPage } from "./InvitationPage.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

const invitation = {
  id: "invitation-1",
  email: "member@example.com",
  role: "MEMBER",
  expiresAt: "2026-10-27T20:00:00.000Z",
  workspace: { id: "workspace-1", name: "Product team" },
  invitedBy: { name: "Ahmad Nabouty" },
};

function renderPage(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/invite/a-valid-invitation-token"]}>
        <Routes>
          <Route path="/invite/:token" element={<InvitationPage />} />
          <Route path="/app" element={<h1>Projects</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  apiRequest.mockReset();
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === "/api/invitations/a-valid-invitation-token" && !options.method) {
      return Promise.resolve({ data: { invitation } });
    }
    if (path === "/api/invitations/a-valid-invitation-token/accept") {
      return Promise.resolve({ data: { workspace: invitation.workspace } });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});

describe("Team invitation page", () => {
  it("offers login and registration to a guest", async () => {
    renderPage({ user: null, isLoading: false });

    expect(await screen.findByRole("heading", { name: "Join Product team" })).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in to accept" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
  });

  it("accepts the invitation for the matching account", async () => {
    const user = userEvent.setup();
    renderPage({
      user: { id: "user-2", name: "Team Member", email: "member@example.com" },
      isLoading: false,
    });

    await user.click(await screen.findByRole("button", { name: "Accept invitation" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/invitations/a-valid-invitation-token/accept",
        { method: "POST" },
      );
    });
    expect(await screen.findByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(localStorage.getItem("ordanly.activeWorkspaceId")).toBe("workspace-1");
  });

  it("does not expose acceptance to the wrong account", async () => {
    renderPage({
      user: { id: "user-3", name: "Other User", email: "other@example.com" },
      isLoading: false,
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This invitation belongs to member@example.com",
    );
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });
});
