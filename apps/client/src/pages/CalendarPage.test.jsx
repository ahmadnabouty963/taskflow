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
  apiRequest.mockReset().mockImplementation((path, options = {}) => {
    if (path === "/api/projects") {
      return Promise.resolve({
        data: {
          projects: [
            {
              id: "project-1",
              title: "Ordanly launch",
              color: "#2f6049",
              archivedAt: null,
            },
          ],
        },
      });
    }

    if (path.startsWith("/api/tasks?")) {
      return Promise.resolve({
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
                color: "#2f6049",
              },
            },
          ],
        },
      });
    }

    if (
      path === "/api/projects/project-1/tasks" &&
      options.method === "POST"
    ) {
      return Promise.resolve({
        data: {
          task: {
            id: "task-2",
            projectId: "project-1",
            title: "Prepare calendar demo",
            description: "",
            status: "TODO",
            priority: "MEDIUM",
            dueDate: JSON.parse(options.body).dueDate,
          },
        },
      });
    }

    throw new Error("Unexpected API request: " + path);
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
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks?"),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("creates a task by selecting a calendar day", async () => {
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText("Present Ordanly");
    await user.click(
      screen.getAllByRole("button", { name: /add task on/i })[0],
    );

    expect(
      screen.getByRole("heading", { name: "Create a task" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Project")).toHaveValue("project-1");
    expect(screen.getByLabelText("Due date")).not.toHaveValue("");

    await user.type(
      screen.getByRole("textbox", { name: "Task title" }),
      "Prepare calendar demo",
    );
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/projects/project-1/tasks",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Prepare calendar demo")).toBeInTheDocument();
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
