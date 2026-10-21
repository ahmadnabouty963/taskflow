import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { TaskDialog } from "./TaskDialog.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

describe("Task metadata", () => {
  it("assigns a workspace member and label when creating a task", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    apiRequest.mockImplementation((path, options = {}) => {
      if (path.endsWith("/tasks/options")) return Promise.resolve({ data: {
        workspaceId: "workspace-1", canCreateLabels: true,
        members: [{ id: "member-1", name: "Mina Team", email: "mina@example.com", role: "MEMBER" }],
        labels: [{ id: "label-1", name: "Design", color: "#E11D48" }],
      } });
      if (path.endsWith("/tasks") && options.method === "POST") return Promise.resolve({ data: { task: { id: "task-1" } } });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(<TaskDialog onClose={vi.fn()} onSaved={onSaved} projectId="project-1" />);
    await screen.findByRole("option", { name: "Mina Team" });
    await user.type(screen.getByLabelText("Task title"), "Prepare concept");
    await user.selectOptions(screen.getByLabelText("Responsible person"), "member-1");
    await user.click(screen.getByText("Design"));
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const createCall = apiRequest.mock.calls.find(([path, options]) => path.endsWith("/tasks") && options?.method === "POST");
    expect(JSON.parse(createCall[1].body)).toMatchObject({ assigneeId: "member-1", labelIds: ["label-1"] });
  });
});
