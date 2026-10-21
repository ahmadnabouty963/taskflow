import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/auth-context.js";
import { LanguageContext } from "../context/language-context.js";
import { createLanguageValue } from "../test/language.js";
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

function renderPlanningPage(mode, language = "en") {
  return render(
    <AuthContext.Provider value={authValue}>
      <LanguageContext.Provider value={createLanguageValue(language)}>
        <MemoryRouter>
          <PlanningPage mode={mode} />
        </MemoryRouter>
      </LanguageContext.Provider>
    </AuthContext.Provider>,
  );
}

function mockAgenda({ tasks = [], events = [] } = {}) {
  apiRequest.mockImplementation((path) => {
    if (path.startsWith("/api/tasks?")) {
      return Promise.resolve({ data: { tasks } });
    }

    if (path.startsWith("/api/events?")) {
      return Promise.resolve({ data: { events } });
    }

    return Promise.reject(new Error("Unexpected request: " + path));
  });
}

function requestPathFor(prefix) {
  return apiRequest.mock.calls.find(([path]) => path.startsWith(prefix))[0];
}

function daysFromNow(days, hours = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

beforeEach(() => {
  apiRequest.mockReset();
  authValue.logout.mockReset();
});

describe("Planning pages", () => {
  it("shows today's tasks from multiple projects", async () => {
    mockAgenda({
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
    });

    renderPlanningPage("today");

    expect(
      await screen.findByRole("heading", { name: "Prepare presentation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ordanly release")).toBeInTheDocument();
    expect(requestPathFor("/api/tasks?")).toContain("excludeStatus=DONE");
  });

  it("shows today's calendar events", async () => {
    mockAgenda({
      events: [
        {
          id: "event-1",
          title: "Dentist",
          location: "Main Street 4",
          startsAt: daysFromNow(0, 9).toISOString(),
          endsAt: daysFromNow(0, 10).toISOString(),
          allDay: false,
          color: "#2F6049",
        },
      ],
    });

    renderPlanningPage("today");

    expect(
      await screen.findByRole("heading", { name: "Dentist" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Main Street 4")).toBeInTheDocument();
    expect(screen.getByText("Events today")).toBeInTheDocument();
    expect(requestPathFor("/api/events?")).toContain("from=");
  });

  it("shows the calendar and creator of shared events", async () => {
    mockAgenda({
      events: [
        {
          id: "event-1",
          title: "Family dinner",
          location: "Home",
          startsAt: daysFromNow(0, 18).toISOString(),
          endsAt: daysFromNow(0, 19).toISOString(),
          allDay: false,
          color: "#3B6F92",
          owner: { id: "user-2", name: "Sara" },
          workspace: { id: "family-1", name: "Family", type: "TEAM" },
        },
      ],
    });

    renderPlanningPage("today");

    expect(
      await screen.findByText("Family · by Sara · Home"),
    ).toBeInTheDocument();
  });

  it("loads the next seven days for Upcoming", async () => {
    mockAgenda();

    renderPlanningPage("upcoming");

    expect(
      await screen.findByRole("heading", { name: "A clear week ahead" }),
    ).toBeInTheDocument();

    for (const prefix of ["/api/tasks?", "/api/events?"]) {
      const requestPath = requestPathFor(prefix);
      expect(requestPath).toContain("from=");
      expect(requestPath).toContain("to=");
    }
  });

  it("groups upcoming events and tasks on the same day", async () => {
    const day = daysFromNow(3);

    mockAgenda({
      tasks: [
        {
          id: "task-1",
          title: "Send report",
          status: "TODO",
          priority: "LOW",
          dueDate: day.toISOString(),
          project: { id: "project-1", title: "Work" },
        },
      ],
      events: [
        {
          id: "event-1",
          title: "Parents evening",
          location: null,
          startsAt: day.toISOString(),
          endsAt: daysFromNow(3, 11).toISOString(),
          allDay: false,
          color: "#2F6049",
        },
      ],
    });

    renderPlanningPage("upcoming");

    const eventHeading = await screen.findByRole("heading", {
      name: "Parents evening",
    });
    const group = eventHeading.closest("section");

    expect(group).toContainElement(
      screen.getByRole("heading", { name: "Send report" }),
    );
    expect(group.querySelector("header > span")).toHaveTextContent("2");
  });

  it("shows the error state when events fail to load", async () => {
    apiRequest.mockImplementation((path) =>
      path.startsWith("/api/events?")
        ? Promise.reject(new Error("Network error"))
        : Promise.resolve({ data: { tasks: [] } }),
    );

    renderPlanningPage("upcoming");

    expect(
      await screen.findByRole("heading", {
        name: "Your agenda could not be loaded.",
      }),
    ).toBeInTheDocument();
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

      if (path.startsWith("/api/events?")) {
        return Promise.resolve({ data: { events: [] } });
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

  it("shows the agenda in German", async () => {
    mockAgenda({
      events: [
        {
          id: "event-1",
          title: "Familienessen",
          location: null,
          startsAt: daysFromNow(0, 18).toISOString(),
          endsAt: daysFromNow(0, 19).toISOString(),
          allDay: false,
          color: "#3B6F92",
          owner: { id: "user-2", name: "Sara" },
          workspace: { id: "family-1", name: "Familie", type: "TEAM" },
        },
      ],
    });

    renderPlanningPage("today", "de");

    expect(await screen.findByRole("heading", { name: "Familienessen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Heute" })).toBeInTheDocument();
    expect(screen.getByText("Termine heute")).toBeInTheDocument();
    expect(screen.getByText("Familie · von Sara")).toBeInTheDocument();
    expect(screen.getByText("1 Termin · 0 offene Aufgaben")).toBeInTheDocument();
  });
});
