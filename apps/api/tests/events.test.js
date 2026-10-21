import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Event Owner",
  email: "event-owner@example.com",
  password: "StrongPass123",
};

const other = {
  name: "Event Other",
  email: "event-other@example.com",
  password: "StrongPass123",
};

async function deleteUsers() {
  await prisma.user.deleteMany({
    where: { email: { in: [owner.email, other.email] } },
  });
}

async function registerAndLogin(user) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user);
  await agent.post("/api/auth/login").send({
    email: user.email,
    password: user.password,
  });
  return agent;
}

const eventPayload = {
  title: "IHK presentation",
  description: "Present the Ordanly frontend.",
  location: "Google Meet",
  startsAt: "2026-10-23T08:00:00.000Z",
  endsAt: "2026-10-23T09:00:00.000Z",
  allDay: false,
  color: "#DF6B43",
};

let ownerAgent;
let otherAgent;

beforeEach(async () => {
  await deleteUsers();
  ownerAgent = await registerAndLogin(owner);
  otherAgent = await registerAndLogin(other);
});

afterEach(deleteUsers);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Calendar events API", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await request(app).get(
      "/api/events?from=2026-10-01T00%3A00%3A00.000Z&to=2026-11-01T00%3A00%3A00.000Z",
    );
    expect(response.statusCode).toBe(401);
  });

  it("creates and lists an event without a project", async () => {
    const created = await ownerAgent.post("/api/events").send(eventPayload);
    expect(created.statusCode).toBe(201);
    expect(created.body.data.event).toMatchObject({
      title: eventPayload.title,
      location: eventPayload.location,
      allDay: false,
    });

    const response = await ownerAgent.get(
      "/api/events?from=2026-10-20T00%3A00%3A00.000Z&to=2026-10-25T00%3A00%3A00.000Z",
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.data.events).toHaveLength(1);
    expect(response.body.data.events[0].title).toBe(eventPayload.title);
  });

  it("keeps events private to their owner", async () => {
    await ownerAgent.post("/api/events").send(eventPayload);
    const response = await otherAgent.get(
      "/api/events?from=2026-10-20T00%3A00%3A00.000Z&to=2026-10-25T00%3A00%3A00.000Z",
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.data.events).toEqual([]);
  });

  it("updates and deletes an owned event", async () => {
    const created = await ownerAgent.post("/api/events").send(eventPayload);
    const eventId = created.body.data.event.id;

    const updated = await ownerAgent
      .patch("/api/events/" + eventId)
      .send({ ...eventPayload, title: "Updated presentation" });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.data.event.title).toBe("Updated presentation");

    const deleted = await ownerAgent.delete("/api/events/" + eventId);
    expect(deleted.statusCode).toBe(204);
  });

  it("stores events without a calendar in the personal workspace", async () => {
    const created = await ownerAgent.post("/api/events").send(eventPayload);

    expect(created.statusCode).toBe(201);
    expect(created.body.data.event.workspace.type).toBe("PERSONAL");
    expect(created.body.data.event.owner.name).toBe(owner.name);
  });

  describe("shared calendars", () => {
    let workspaceId;
    let otherUserId;

    async function addOther(role) {
      await prisma.workspaceMember.create({
        data: { workspaceId, userId: otherUserId, role },
      });
    }

    beforeEach(async () => {
      const workspace = await ownerAgent
        .post("/api/workspaces")
        .send({ name: "Family" });
      workspaceId = workspace.body.data.workspace.id;
      const otherUser = await prisma.user.findUnique({
        where: { email: other.email },
      });
      otherUserId = otherUser.id;
    });

    it("shows shared events to every member with their creator", async () => {
      await addOther("MEMBER");
      await ownerAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });

      const response = await otherAgent.get(
        "/api/events?from=2026-10-20T00%3A00%3A00.000Z&to=2026-10-25T00%3A00%3A00.000Z",
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.events).toHaveLength(1);
      expect(response.body.data.events[0]).toMatchObject({
        owner: { name: owner.name },
        workspace: { id: workspaceId, name: "Family", type: "TEAM" },
      });
    });

    it("lets members add events to the shared calendar", async () => {
      await addOther("MEMBER");

      const created = await otherAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });

      expect(created.statusCode).toBe(201);
      expect(created.body.data.event.workspaceId).toBe(workspaceId);
    });

    it("blocks viewers from creating events", async () => {
      await addOther("VIEWER");

      const created = await otherAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });

      expect(created.statusCode).toBe(403);
      expect(created.body.error.code).toBe("WORKSPACE_PERMISSION_DENIED");
    });

    it("hides shared calendars from non-members", async () => {
      await ownerAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });

      const created = await otherAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });
      const response = await otherAgent.get(
        "/api/events?from=2026-10-20T00%3A00%3A00.000Z&to=2026-10-25T00%3A00%3A00.000Z",
      );

      expect(created.statusCode).toBe(404);
      expect(response.body.data.events).toEqual([]);
    });

    it("lets members change only their own events", async () => {
      await addOther("MEMBER");
      const created = await ownerAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });
      const eventId = created.body.data.event.id;

      const updated = await otherAgent
        .patch("/api/events/" + eventId)
        .send({ ...eventPayload, title: "Changed by someone else" });
      const deleted = await otherAgent.delete("/api/events/" + eventId);

      expect(updated.statusCode).toBe(403);
      expect(deleted.statusCode).toBe(403);
    });

    it("lets admins remove events created by others", async () => {
      await addOther("ADMIN");
      const created = await ownerAgent
        .post("/api/events")
        .send({ ...eventPayload, workspaceId });

      const deleted = await otherAgent.delete(
        "/api/events/" + created.body.data.event.id,
      );

      expect(deleted.statusCode).toBe(204);
    });

    it("moves an event from the personal to the shared calendar", async () => {
      const created = await ownerAgent.post("/api/events").send(eventPayload);

      const updated = await ownerAgent
        .patch("/api/events/" + created.body.data.event.id)
        .send({ ...eventPayload, workspaceId });

      expect(updated.statusCode).toBe(200);
      expect(updated.body.data.event.workspace.name).toBe("Family");
    });
  });

  it("rejects an end time before the start time", async () => {
    const response = await ownerAgent.post("/api/events").send({
      ...eventPayload,
      endsAt: "2026-10-23T07:00:00.000Z",
    });
    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
