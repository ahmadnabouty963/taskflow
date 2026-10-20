import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";
import { PlanningPage } from "./PlanningPage.jsx";

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

function renderPlanningPage(mode) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <PlanningPage mode={mode} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
  authValue.logout.mockReset();
});

describe("Planning pages", () => {
  it("shows today's tasks from multiple projects", async () => {
    apiRequest.mockResolvedValue({
      data: {
        tasks: [
          {
            id: "task-1",
            title: "Prepare presentation",
            status: "TODO",
            priority: "HIGH",
            dueDate: new Date().toISOString(),
            project: {
              id: "project-1",
              title: "Ordanly release",
            },
          },
        ],
      },
    });

    renderPlanningPage("today");

    expect(
      await screen.findByRole("heading", { name: "Prepare presentation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ordanly release")).toBeInTheDocument();
    expect(apiRequest.mock.calls[0][0]).toContain("/api/tasks?");
    expect(apiRequest.mock.calls[0][0]).toContain("excludeStatus=DONE");
  });

  it("loads the next seven days for Upcoming", async () => {
    apiRequest.mockResolvedValue({
      data: {
        tasks: [],
      },
    });

    renderPlanningPage("upcoming");

    expect(
      await screen.findByRole("heading", { name: "A clear week ahead" }),
    ).toBeInTheDocument();

    const requestPath = apiRequest.mock.calls[0][0];
    expect(requestPath).toContain("from=");
    expect(requestPath).toContain("to=");
  });

  it("updates a task status from the planning list", async () => {
    const user = userEvent.setup();

    apiRequest.mockImplementation((path, options = {}) => {
      if (path.startsWith("/api/tasks?")) {
        return Promise.resolve({
          data: {
            tasks: [
              {
                id: "task-1",
                title: "Finish documentation",
                status: "TODO",
                priority: "MEDIUM",
                dueDate: new Date().toISOString(),
                project: {
                  id: "project-1",
                  title: "Ordanly",
                },
              },
            ],
          },
        });
      }

      if (
        path === "/api/projects/project-1/tasks/task-1" &&
        options.method === "PATCH"
      ) {
        return Promise.resolve({ data: { task: {} } });
      }

      return Promise.reject(new Error("Unexpected request: " + path));
    });

    renderPlanningPage("today");
    await screen.findByRole("heading", { name: "Finish documentation" });

    await user.selectOptions(
      screen.getByLabelText("Change status for Finish documentation"),
      "DONE",
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/projects/project-1/tasks/task-1",
        {
          method: "PATCH",
          body: JSON.stringify({ status: "DONE" }),
        },
      );
    });
  });
});
