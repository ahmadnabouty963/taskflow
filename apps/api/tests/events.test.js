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

  it("rejects an end time before the start time", async () => {
    const response = await ownerAgent.post("/api/events").send({
      ...eventPayload,
      endsAt: "2026-10-23T07:00:00.000Z",
    });
    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
