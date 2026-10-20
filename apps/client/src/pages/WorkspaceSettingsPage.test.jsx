import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { WorkspaceSettingsPage } from "./WorkspaceSettingsPage.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/workspaces/workspace-1/settings"]}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === "/api/workspaces") {
      return Promise.resolve({ data: { workspaces: [{ id: "workspace-1", name: "Product team", type: "TEAM", role: "OWNER" }] } });
    }
    if (path === "/api/workspaces/workspace-1/members" && !options.method) {
      return Promise.resolve({ data: { currentRole: "OWNER", members: [{ workspaceId: "workspace-1", userId: "user-1", role: "OWNER", user: { id: "user-1", name: "Ahmad Nabouty", email: "ahmad@example.com" } }] } });
    }
    if (path === "/api/workspaces/workspace-1/invitations" && !options.method) {
      return Promise.resolve({ data: { invitations: [] } });
    }
    if (path === "/api/workspaces/workspace-1/invitations" && options.method === "POST") {
      return Promise.resolve({ data: { invitation: { id: "invite-1", email: "member@example.com", role: "MEMBER", expiresAt: "2026-10-27T20:00:00.000Z" } } });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});

describe("Workspace settings", () => {
  it("shows members and their roles", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Product team" })).toBeInTheDocument();
    expect(screen.getByText("Ahmad Nabouty")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("sends an expiring email invitation", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Product team" });
    await user.type(screen.getByLabelText("Email address"), "member@example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText("Invitation sent to member@example.com.")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/workspaces/workspace-1/invitations",
      { method: "POST", body: JSON.stringify({ email: "member@example.com", role: "MEMBER" }) },
    );
  });
});
