import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { TaskDetailsPanel } from "./TaskDetailsPanel.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

const task = { id: "task-1", title: "Prepare presentation" };
const noAttachments = {
  data: { attachments: [], uploadsEnabled: false, limits: { maxBytes: 10485760, contentTypes: [] } },
};
const details = {
  ...task,
  description: "Explain the product clearly.",
  status: "IN_PROGRESS",
  priority: "HIGH",
  dueDate: null,
  subtasks: [
    { id: "subtask-1", title: "Write introduction", completed: false },
  ],
  comments: [],
};

beforeEach(() => {
  apiRequest.mockReset();
});

describe("Task details panel", () => {
  it("loads details and completes a subtask", async () => {
    const user = userEvent.setup();
    apiRequest.mockImplementation((path, options = {}) => {
      if (path.endsWith("/attachments")) return Promise.resolve(noAttachments);
      if (!options.method) return Promise.resolve({ data: { task: details } });
      if (path.endsWith("/subtasks/subtask-1")) {
        return Promise.resolve({
          data: { subtask: { ...details.subtasks[0], completed: true } },
        });
      }
      return Promise.reject(new Error("Unexpected request: " + path));
    });

    render(<TaskDetailsPanel onClose={vi.fn()} projectId="project-1" task={task} />);
    expect(await screen.findByText("Write introduction")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/projects/project-1/tasks/task-1/subtasks/subtask-1",
        { method: "PATCH", body: JSON.stringify({ completed: true }) },
      );
    });
    expect(screen.getByRole("progressbar", { name: "Subtask completion" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("adds a comment", async () => {
    const user = userEvent.setup();
    apiRequest.mockImplementation((path, options = {}) => {
      if (path.endsWith("/attachments")) return Promise.resolve(noAttachments);
      if (!options.method) return Promise.resolve({ data: { task: details } });
      if (path.endsWith("/comments")) {
        return Promise.resolve({
          data: {
            comment: {
              id: "comment-1",
              body: "Ready for review",
              createdAt: "2026-10-20T12:00:00.000Z",
              author: { id: "user-1", name: "Ahmad Nabouty" },
            },
          },
        });
      }
      return Promise.reject(new Error("Unexpected request: " + path));
    });

    render(<TaskDetailsPanel onClose={vi.fn()} projectId="project-1" task={task} />);
    await screen.findByText("No comments yet.");
    await user.type(screen.getByLabelText("New comment"), "Ready for review");
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(await screen.findByText("Ready for review")).toBeInTheDocument();
    expect(screen.getByText("Ahmad Nabouty")).toBeInTheDocument();
  });
});
