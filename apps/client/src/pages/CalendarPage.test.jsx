import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";
import { CalendarPage } from "./CalendarPage.jsx";

vi.mock("../lib/api.js", () => ({
  apiRequest: vi.fn(),
}));

const authValue = {
  user: {
    id: "user-1",
    name: "Ahmad Nabouti",
    email: "ahmad@example.com",
  },
  logout: vi.fn(),
};

function renderCalendar() {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset().mockResolvedValue({
    data: {
      tasks: [
        {
          id: "task-1",
          title: "Present Ordanly",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: new Date().toISOString(),
          project: {
            id: "project-1",
            title: "Ordanly launch",
          },
        },
      ],
    },
  });
  authValue.logout.mockReset();
});

describe("Calendar", () => {
  it("shows scheduled tasks in month view", async () => {
    renderCalendar();

    expect(
      await screen.findByText("Present Ordanly"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Month calendar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(apiRequest.mock.calls[0][0]).toContain("/api/tasks?");
  });

  it("switches to week view and navigates periods", async () => {
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText("Present Ordanly");
    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(
      await screen.findByRole("region", { name: "Week calendar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous period" }),
    ).toHaveTextContent("Previous");
    expect(screen.getByRole("button", { name: "Next period" })).toHaveTextContent(
      "Next",
    );

    await user.click(screen.getByRole("button", { name: "Next period" }));

    await waitFor(() => {
      expect(apiRequest.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
