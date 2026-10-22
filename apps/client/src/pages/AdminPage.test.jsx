import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { LanguageContext } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { createLanguageValue } from "../test/language.js";
import { AdminPage } from "./AdminPage.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

const adminUser = { id: "admin-1", name: "Ahmad", email: "ahmad@example.com", isPlatformAdmin: true };

const overview = {
  users: { total: 42, verified: 40, blocked: 1, active7: 12, active30: 30 },
  content: { workspaces: 50, teamWorkspaces: 8, projects: 70, tasks: 300, events: 90 },
  storage: { files: 15, bytes: 5 * 1024 * 1024 },
  countries: [{ value: "DE", count: 30 }, { value: "AT", count: 5 }],
  devices: [{ value: "MOBILE", count: 20 }, { value: "DESKTOP", count: 15 }],
  signups: [{ day: new Date().toISOString().slice(0, 10), count: 3 }],
};

const sara = {
  id: "user-2",
  name: "Sara",
  email: "sara@example.com",
  isPlatformAdmin: false,
  emailVerifiedAt: "2026-10-01T10:00:00.000Z",
  blockedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  lastActiveAt: new Date().toISOString(),
  lastLoginCountry: "DE",
  lastLoginDevice: "MOBILE",
  lastLoginBrowser: "Chrome",
  workspaces: 2,
  projects: 3,
  storageBytes: 2048,
  isCurrentUser: false,
};

const traffic = {
  days: 30,
  totals: { visitors: 120, pageViews: 340, visitorsToday: 9, signups: 6, conversionRate: 0.05 },
  daily: [{ day: new Date().toISOString().slice(0, 10), visitors: 9, pageViews: 20 }],
  pages: [{ value: "/", count: 200 }, { value: "/register", count: 40 }],
  referrers: [{ value: null, count: 70 }, { value: "google.com", count: 30 }],
  countries: [{ value: "DE", count: 90 }],
  devices: [{ value: "MOBILE", count: 60 }],
  browsers: [{ value: "Safari", count: 50 }],
  monthly: [],
};

function mockAdminApi() {
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === "/api/admin/overview") return Promise.resolve({ data: overview });
    if (path.startsWith("/api/admin/traffic")) return Promise.resolve({ data: { ...traffic, days: Number(new URLSearchParams(path.split("?")[1]).get("days")) } });
    if (path.startsWith("/api/admin/users?")) {
      return Promise.resolve({ data: { users: [sara], pagination: { page: 1, limit: 25, total: 1, totalPages: 1 } } });
    }
    if (options.method === "PATCH") {
      return Promise.resolve({ data: { user: { id: sara.id, blockedAt: JSON.parse(options.body).blocked ? "2026-10-22T10:00:00.000Z" : null } } });
    }
    if (options.method === "DELETE") return Promise.resolve(null);
    return Promise.reject(new Error("Unexpected request: " + path));
  });
}

function renderAdmin(user = adminUser, language = "en") {
  return render(
    <AuthContext.Provider value={{ user, logout: vi.fn() }}>
      <LanguageContext.Provider value={createLanguageValue(language)}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </LanguageContext.Provider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
  mockAdminApi();
});

describe("Admin dashboard", () => {
  it("shows no data to regular users", () => {
    renderAdmin({ ...adminUser, isPlatformAdmin: false });

    expect(screen.getByRole("heading", { name: "No access" })).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("shows key figures, countries and devices", async () => {
    renderAdmin();

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("40 verified · 1 blocked")).toBeInTheDocument();
    expect(screen.getByText("5 MB")).toBeInTheDocument();
    const countries = screen.getByRole("region", { name: "Countries at last login" });
    expect(within(countries).getByText("Germany")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Devices at last login" })).getByText("Phone")).toBeInTheDocument();
  });

  it("lists accounts with country and device", async () => {
    renderAdmin();

    const row = (await screen.findByText("sara@example.com")).closest("tr");
    expect(within(row).getByText("Sara")).toBeInTheDocument();
    expect(within(row).getByText("Phone · Chrome")).toBeInTheDocument();
    expect(within(row).getByText("Workspaces: 2 · Projects: 3")).toBeInTheDocument();
  });

  it("blocks and unblocks an account", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("sara@example.com");

    await user.click(screen.getByRole("button", { name: "Block" }));
    expect(await screen.findByText("Blocked", { selector: ".admin-badge" })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/users/user-2", { method: "PATCH", body: JSON.stringify({ blocked: true }) });

    await user.click(screen.getByRole("button", { name: "Unblock" }));
    await waitFor(() => expect(screen.queryByText("Blocked", { selector: ".admin-badge" })).not.toBeInTheDocument());
  });

  it("only deletes after the email address is typed", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText("sara@example.com");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const submit = screen.getByRole("button", { name: "Delete account" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Type the email address to confirm"), "SARA@example.com");
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(screen.queryByText("sara@example.com")).not.toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith("/api/admin/users/user-2", {
      method: "DELETE",
      body: JSON.stringify({ confirmEmail: "SARA@example.com" }),
    });
  });

  it("offers no actions on the admin's own account", async () => {
    apiRequest.mockImplementation((path) => {
      if (path === "/api/admin/overview") return Promise.resolve({ data: overview });
    if (path.startsWith("/api/admin/traffic")) return Promise.resolve({ data: { ...traffic, days: Number(new URLSearchParams(path.split("?")[1]).get("days")) } });
      return Promise.resolve({ data: { users: [{ ...sara, isCurrentUser: true, isPlatformAdmin: true }], pagination: { page: 1, limit: 25, total: 1, totalPages: 1 } } });
    });
    renderAdmin();
    await screen.findByText("sara@example.com");

    expect(screen.queryByRole("button", { name: "Block" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("speaks German with localized country names", async () => {
    renderAdmin(adminUser, "de");

    expect(await screen.findByRole("heading", { name: "Admin-Dashboard" })).toBeInTheDocument();
    expect(await screen.findByText("Handy · Chrome")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Länder bei der letzten Anmeldung" })).getByText("Deutschland")).toBeInTheDocument();
  });

  it("shows visitor statistics and switches the period", async () => {
    const user = userEvent.setup();
    renderAdmin();

    const section = await screen.findByRole("region", { name: "Visitors" });
    expect(await within(section).findByText("120")).toBeInTheDocument();
    expect(within(section).getByText("5%")).toBeInTheDocument();
    expect(within(section).getByText("Homepage")).toBeInTheDocument();
    expect(within(section).getByText("Direct or unknown")).toBeInTheDocument();
    expect(within(section).getByText("google.com")).toBeInTheDocument();

    await user.click(within(section).getByRole("button", { name: "90 days" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/admin/traffic?days=90", expect.anything()));
    expect(within(section).getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true");
  });
});
