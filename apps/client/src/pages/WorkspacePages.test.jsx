import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { apiRequest } from "../lib/api.js";
import { DashboardPage } from "./DashboardPage.jsx";
import { ProjectPage } from "./ProjectPage.jsx";

vi.mock("../lib/api.js", () => ({
  apiRequest: vi.fn(),
}));

const authValue = {
  user: {
    id: "user-1",
    name: "Ahmad Nabouty",
    email: "ahmad@example.com",
  },
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

function renderDashboard() {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

function renderProject() {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/app/projects/project-1"]}>
        <Routes>
          <Route path="/app/projects/:projectId" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
  authValue.logout.mockReset();
});

describe("Workspace pages", () => {
  it("loads and displays the user's projects", async () => {
    apiRequest.mockImplementation((path) => {
      if (path === "/api/workspaces") {
        return Promise.resolve({ data: { workspaces: [{ id: "workspace-1", name: "My workspace", role: "OWNER" }] } });
      }
      return Promise.resolve({ data: { projects: [{
            id: "project-1",
            workspaceId: "workspace-1",
            title: "Website launch",
            description: "Prepare the Ordanly release.",
            updatedAt: "2026-10-19T12:00:00.000Z",
          }] } });
    });

    renderDashboard();

    expect(
      await screen.findByRole("heading", {
        name: "Website launch",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Prepare the Ordanly release."),
    ).toBeInTheDocument();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/projects",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("opens the project dialog from the empty state", async () => {
    const user = userEvent.setup();

    apiRequest.mockImplementation((path) => {
      if (path === "/api/workspaces") {
        return Promise.resolve({ data: { workspaces: [{ id: "workspace-1", name: "My workspace", role: "OWNER" }] } });
      }
      return Promise.resolve({ data: { projects: [] } });
    });

    renderDashboard();

    expect(
      await screen.findByRole("heading", {
        name: "Create your first project",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Create a project",
      }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "Create a project",
      }),
    ).toBeInTheDocument();
  });

  it("loads tasks, opens the task dialog and applies filters", async () => {
    const user = userEvent.setup();

    apiRequest.mockImplementation((path) => {
      if (path === "/api/projects/project-1") {
        return Promise.resolve({
          data: {
            project: {
              id: "project-1",
              title: "Website launch",
              description: "Prepare the release.",
            },
          },
        });
      }

      if (path.includes("/api/projects/project-1/tasks?")) {
        return Promise.resolve({
          data: {
            tasks: [
              {
                id: "task-1",
                title: "Review production",
                description: "Check the live application.",
                status: "TODO",
                priority: "HIGH",
                dueDate: null,
              },
              {
                id: "task-2",
                title: "Publish documentation",
                description: "",
                status: "DONE",
                priority: "MEDIUM",
                dueDate: null,
              },
            ],
            pagination: {
              total:
                path.includes("status=DONE") && path.includes("limit=1")
                  ? 1
                  : 2,
            },
          },
        });
      }

      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    renderProject();

    expect(
      await screen.findByRole("heading", {
        name: "Website launch",
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        name: "Review production",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Publish documentation",
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("progressbar", {
        name: "Project completion",
      }),
    ).toHaveAttribute("aria-valuenow", "50");

    expect(screen.getByText(/1 of 2 tasks completed/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "New task",
      }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "Create a task",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Close dialog",
      }),
    );

    await user.selectOptions(screen.getByLabelText("Filter by status"), "DONE");

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        expect.stringContaining("status=DONE"),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  it("switches to list view and updates a task status", async () => {
    const user = userEvent.setup();

    apiRequest.mockImplementation((path, options = {}) => {
      if (path === "/api/projects/project-1") {
        return Promise.resolve({
          data: {
            project: {
              id: "project-1",
              title: "Product launch",
              description: "Prepare the launch.",
            },
          },
        });
      }

      if (
        path === "/api/projects/project-1/tasks/task-1" &&
        options.method === "PATCH"
      ) {
        return Promise.resolve({
          data: {
            task: {
              id: "task-1",
              title: "Move me",
              status: "IN_PROGRESS",
              priority: "HIGH",
              dueDate: null,
            },
          },
        });
      }

      if (path.includes("/api/projects/project-1/tasks?")) {
        return Promise.resolve({
          data: {
            tasks: [
              {
                id: "task-1",
                title: "Move me",
                description: "",
                status: "TODO",
                priority: "HIGH",
                dueDate: null,
              },
            ],
            pagination: {
              total: path.includes("status=DONE") ? 0 : 1,
            },
          },
        });
      }

      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    renderProject();

    expect(
      await screen.findByRole("heading", { name: "Move me" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("list", { name: "Task list" })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Change status for Move me"),
      "IN_PROGRESS",
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/projects/project-1/tasks/task-1",
        {
          method: "PATCH",
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        },
      );
    });
  });

  it("archives and restores colored projects", async () => {
    const user = userEvent.setup();
    const activeProject = {
      id: "project-color",
      title: "Brand system",
      description: "Polish the visual identity.",
      color: "#E11D48",
      archivedAt: null,
      updatedAt: "2026-10-20T12:00:00.000Z",
      workspaceId: "workspace-1",
    };

    apiRequest.mockImplementation((path, options = {}) => {
      if (path === "/api/projects" && !options.method) {
        return Promise.resolve({ data: { projects: [activeProject] } });
      }
      if (path === "/api/workspaces") {
        return Promise.resolve({ data: { workspaces: [{ id: "workspace-1", name: "My workspace", role: "OWNER" }] } });
      }
      if (path === "/api/projects/project-color" && options.method === "PATCH") {
        return Promise.resolve({
          data: {
            project: {
              ...activeProject,
              archivedAt: "2026-10-20T13:00:00.000Z",
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Brand system" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(await screen.findByText("Brand system was archived.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Brand system" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Archived 1/i }));
    expect(screen.getByRole("heading", { name: "Brand system" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/projects/project-color",
      {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      },
    );
  });

});
