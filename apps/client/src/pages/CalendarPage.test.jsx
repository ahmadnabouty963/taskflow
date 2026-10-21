import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { LanguageContext } from "../context/language-context.js";
import { createLanguageValue } from "../test/language.js";
import { apiRequest } from "../lib/api.js";
import { CalendarPage } from "./CalendarPage.jsx";

vi.mock("../lib/api.js", () => ({ apiRequest: vi.fn() }));

const authValue = { user: { id: "user-1", name: "Ahmad Nabouti", email: "ahmad@example.com" }, logout: vi.fn() };

function renderCalendar() {
  return render(<AuthContext.Provider value={authValue}><MemoryRouter><CalendarPage /></MemoryRouter></AuthContext.Provider>);
}

beforeEach(() => {
  apiRequest.mockReset().mockImplementation((path, options = {}) => {
    if (path === "/api/projects") return Promise.resolve({ data: { projects: [{ id: "project-1", title: "Ordanly launch", color: "#2F6049", archivedAt: null }] } });
    if (path === "/api/projects/project-1/tasks/options") return Promise.resolve({ data: { workspaceId: "workspace-1", members: [], labels: [], canCreateLabels: true } });
    if (path.startsWith("/api/tasks?")) return Promise.resolve({ data: { tasks: [{ id: "task-1", title: "Present Ordanly", status: "IN_PROGRESS", priority: "HIGH", dueDate: new Date().toISOString(), project: { id: "project-1", title: "Ordanly launch", color: "#2F6049" } }] } });
    if (path.startsWith("/api/events?")) return Promise.resolve({ data: { events: [{ id: "event-1", title: "Teacher meeting", description: null, location: "Meet", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), allDay: false, color: "#DF6B43", workspaceId: "personal-1", ownerId: "user-1", owner: { id: "user-1", name: "Ahmad Nabouti" }, workspace: { id: "personal-1", name: "Ahmad Nabouti's workspace", type: "PERSONAL" } }, { id: "event-3", title: "Family dinner", description: null, location: null, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), allDay: false, color: "#3B6F92", workspaceId: "family-1", ownerId: "user-2", owner: { id: "user-2", name: "Sara" }, workspace: { id: "family-1", name: "Family", type: "TEAM" } }] } });
    if (path === "/api/workspaces") return Promise.resolve({ data: { workspaces: [{ id: "personal-1", name: "Ahmad Nabouti's workspace", type: "PERSONAL", role: "OWNER" }, { id: "family-1", name: "Family", type: "TEAM", role: "MEMBER" }] } });
    if (path === "/api/projects/project-1/tasks" && options.method === "POST") return Promise.resolve({ data: { task: { id: "task-2", projectId: "project-1", title: "Prepare calendar demo", description: "", status: "TODO", priority: "MEDIUM", dueDate: JSON.parse(options.body).dueDate } } });
    if (path === "/api/events" && options.method === "POST") return Promise.resolve({ data: { event: { id: "event-2", ...JSON.parse(options.body) } } });
    throw new Error("Unexpected API request: " + path);
  });
  authValue.logout.mockReset();
});

describe("Calendar", () => {
  it("shows project tasks and independent events", async () => {
    renderCalendar();
    expect(await screen.findByText("Present Ordanly")).toBeInTheDocument();
    expect(await screen.findByText("Teacher meeting")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Month calendar" })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("/api/events?"), expect.objectContaining({ signal: expect.anything() }));
  });

  it("creates a project task from the entry chooser", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByText("Present Ordanly");
    await user.click(screen.getAllByRole("button", { name: /add entry on/i })[0]);
    await user.click(screen.getByRole("button", { name: /project task/i }));
    await user.type(screen.getByRole("textbox", { name: "Task title" }), "Prepare calendar demo");
    await user.click(screen.getByRole("button", { name: "Create task" }));
    expect(await screen.findByText("Prepare calendar demo")).toBeInTheDocument();
  });

  it("creates an event without selecting a project", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByText("Teacher meeting");
    await user.click(screen.getAllByRole("button", { name: /add entry on/i })[0]);
    await user.click(screen.getByRole("button", { name: /calendar event/i }));
    await user.type(screen.getByRole("textbox", { name: "Event title" }), "Dentist appointment");
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Husum");
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/events", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText("Dentist appointment")).toBeInTheDocument();
  });

  it("shows shared events with their creator and filters calendars", async () => {
    const user = userEvent.setup();
    renderCalendar();
    expect(await screen.findByText("Family dinner")).toBeInTheDocument();
    expect(screen.getByText(/· Sara/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Family" }));
    expect(screen.queryByText("Family dinner")).not.toBeInTheDocument();
    expect(screen.getByText("Teacher meeting")).toBeInTheDocument();
  });

  it("creates an event in the selected calendar", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByRole("checkbox", { name: "Family" });
    await user.click(screen.getAllByRole("button", { name: /add entry on/i })[0]);
    await user.click(screen.getByRole("button", { name: /calendar event/i }));
    expect(screen.getByRole("combobox", { name: "Calendar" })).toHaveValue("personal-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Calendar" }), "family-1");
    await user.type(screen.getByRole("textbox", { name: "Event title" }), "Parents evening");
    await user.click(screen.getByRole("button", { name: "Create event" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/events", expect.objectContaining({ method: "POST", body: expect.stringContaining("\"workspaceId\":\"family-1\"") })));
  });

  it("opens events created by other members as read-only", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByRole("checkbox", { name: "Family" });
    await user.click(await screen.findByRole("button", { name: /family dinner/i }));
    expect(screen.getByRole("heading", { name: "Event details" })).toBeInTheDocument();
    expect(screen.getByText("Family · Created by Sara")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Event title" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("switches to week view and navigates periods", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByText("Present Ordanly");
    await user.click(screen.getByRole("button", { name: "Week" }));
    expect(await screen.findByRole("region", { name: "Week calendar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next period" }));
    await waitFor(() => expect(apiRequest.mock.calls.filter(([path]) => path.startsWith("/api/events?")).length).toBeGreaterThanOrEqual(2));
  });

  it("shows the calendar in German", async () => {
    render(<AuthContext.Provider value={authValue}><LanguageContext.Provider value={createLanguageValue("de")}><MemoryRouter><CalendarPage /></MemoryRouter></LanguageContext.Provider></AuthContext.Provider>);
    expect(await screen.findByText("Teacher meeting")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Kalender" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Woche" })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: "Persönlich" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Monatskalender" })).toBeInTheDocument();
  });
});
