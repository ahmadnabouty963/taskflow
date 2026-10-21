import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { AppNavigation } from "./AppNavigation.jsx";

const authValue = {
  user: { id: "user-1", name: "Ahmad Nabouti", email: "ahmad@example.com" },
  logout: vi.fn(),
};

function renderNavigation(props) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/app/today"]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="*" element={<AppNavigation {...props} />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  authValue.logout.mockReset();
});

describe("App navigation", () => {
  it("offers every section in the mobile bottom bar", () => {
    renderNavigation({ active: "today" });

    const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
    const links = within(mobileNav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Projects",
      "Today",
      "Upcoming",
      "Calendar",
      "Settings",
    ]);
    expect(within(mobileNav).getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/app/calendar");
    expect(within(mobileNav).getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  });

  it("marks the current project in the sidebar", () => {
    renderNavigation({ active: "projects", currentProject: true });

    const sidebarNav = screen.getByRole("navigation", { name: "Workspace navigation" });

    expect(within(sidebarNav).getByText("Current project")).toHaveClass("workspace-nav__item--active");
    expect(within(sidebarNav).getByRole("link", { name: "Projects" })).not.toHaveClass("workspace-nav__item--active");
  });

  it("logs out and reports failures", async () => {
    const user = userEvent.setup();
    const onLogoutError = vi.fn();
    authValue.logout.mockRejectedValueOnce(new Error("Network error"));
    renderNavigation({ active: "today", onLogoutError });

    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(onLogoutError).toHaveBeenCalledWith("Network error");

    authValue.logout.mockResolvedValueOnce();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
