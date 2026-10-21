import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const user = {
  name: "Recurring Task Owner",
  email: "recurring-task-owner@example.com",
  password: "StrongPass123",
};

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: user.email } });
}

async function setup() {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user).expect(201);
  await agent.post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);
  const projectResponse = await agent.post("/api/projects").send({ title: "Recurring work" }).expect(201);
  return { agent, projectId: projectResponse.body.data.project.id };
}

beforeEach(cleanup);
afterEach(cleanup);
afterAll(() => prisma.$disconnect());

describe("Recurring tasks and time tracking", () => {
  it("creates exactly one next weekly occurrence when completed", async () => {
    const { agent, projectId } = await setup();
    const created = await agent.post(`/api/projects/${projectId}/tasks`).send({
      title: "Weekly review",
      dueDate: "2026-10-21T12:00:00.000Z",
      recurrence: "WEEKLY",
      estimatedMinutes: 90,
      actualMinutes: 75,
    }).expect(201);
    const taskId = created.body.data.task.id;

    const completed = await agent.patch(`/api/projects/${projectId}/tasks/${taskId}`).send({ status: "DONE" }).expect(200);
    expect(completed.body.data.nextOccurrence).toMatchObject({
      title: "Weekly review",
      status: "TODO",
      recurrence: "WEEKLY",
      estimatedMinutes: 90,
      actualMinutes: null,
      recurringFromId: taskId,
    });
    expect(completed.body.data.nextOccurrence.dueDate).toBe("2026-10-28T12:00:00.000Z");

    await agent.patch(`/api/projects/${projectId}/tasks/${taskId}`).send({ status: "TODO" }).expect(200);
    await agent.patch(`/api/projects/${projectId}/tasks/${taskId}`).send({ status: "DONE" }).expect(200);
    expect(await prisma.task.count({ where: { recurringFromId: taskId } })).toBe(1);
  });

  it("clamps monthly recurrence to the last valid day", async () => {
    const { agent, projectId } = await setup();
    const created = await agent.post(`/api/projects/${projectId}/tasks`).send({
      title: "Month end",
      dueDate: "2027-01-31T12:00:00.000Z",
      recurrence: "MONTHLY",
    }).expect(201);
    const completed = await agent.patch(`/api/projects/${projectId}/tasks/${created.body.data.task.id}`).send({ status: "DONE" }).expect(200);
    expect(completed.body.data.nextOccurrence.dueDate).toBe("2027-02-28T12:00:00.000Z");
  });

  it("requires a due date for recurring tasks", async () => {
    const { agent, projectId } = await setup();
    const response = await agent.post(`/api/projects/${projectId}/tasks`).send({
      title: "Missing schedule",
      recurrence: "DAILY",
    });
    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
