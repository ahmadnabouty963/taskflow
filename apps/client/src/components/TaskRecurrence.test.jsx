import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api.js";
import { TaskCard } from "./TaskCard.jsx";
import { TaskDialog } from "./TaskDialog.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

describe("Task recurrence and time", () => {
  it("submits a weekly task with estimate and time spent", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    apiRequest.mockImplementation((path, options = {}) => {
      if (path.endsWith("/tasks/options")) return Promise.resolve({ data: { workspaceId: "workspace-1", members: [], labels: [], canCreateLabels: true } });
      if (path.endsWith("/tasks") && options.method === "POST") return Promise.resolve({ data: { task: { id: "task-1" } } });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(<TaskDialog onClose={vi.fn()} onSaved={onSaved} projectId="project-1" />);
    await screen.findByText("No labels yet. Create the first one below.");
    await user.type(screen.getByLabelText("Task title"), "Weekly planning");
    await user.type(screen.getByLabelText("Due date"), "2026-10-28");
    await user.selectOptions(screen.getByLabelText("Repeat"), "WEEKLY");
    await user.type(screen.getByLabelText("Estimated time (minutes)"), "90");
    await user.type(screen.getByLabelText("Time spent (minutes)"), "15");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const call = apiRequest.mock.calls.find(([path, options]) => path.endsWith("/tasks") && options?.method === "POST");
    expect(JSON.parse(call[1].body)).toMatchObject({ recurrence: "WEEKLY", estimatedMinutes: 90, actualMinutes: 15 });
  });

  it("shows recurrence and readable durations on a task card", () => {
    render(<TaskCard task={{ id: "task-1", title: "Weekly planning", description: "", status: "TODO", priority: "MEDIUM", dueDate: null, recurrence: "WEEKLY", estimatedMinutes: 90, actualMinutes: 45, labels: [], assignee: null }} statusLabel="To do" isMoving={false} onEdit={vi.fn()} onDelete={vi.fn()} onOpenDetails={vi.fn()} onStatusChange={vi.fn()} onDragStart={vi.fn()} onDragEnd={vi.fn()} />);
    expect(screen.getByText("↻ Weekly")).toBeInTheDocument();
    expect(screen.getByText("Estimate 1h 30m")).toBeInTheDocument();
    expect(screen.getByText("Spent 45m")).toBeInTheDocument();
  });
});
