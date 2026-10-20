import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const user = {
  name: "Task Detail Owner",
  email: "task-detail-owner@example.com",
  password: "StrongPass123",
};

let agent;
let projectId;
let taskId;

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: user.email } });
  agent = request.agent(app);
  await agent.post("/api/auth/register").send(user);
  await agent.post("/api/auth/login").send({
    email: user.email,
    password: user.password,
  });

  const project = await agent.post("/api/projects").send({ title: "Details" });
  projectId = project.body.data.project.id;
  const task = await agent
    .post(`/api/projects/${projectId}/tasks`)
    .send({ title: "Prepare presentation" });
  taskId = task.body.data.task.id;
});

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: user.email } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Task details API", () => {
  it("creates, completes and deletes subtasks", async () => {
    const first = await agent
      .post(`/api/projects/${projectId}/tasks/${taskId}/subtasks`)
      .send({ title: "Write introduction" });
    const second = await agent
      .post(`/api/projects/${projectId}/tasks/${taskId}/subtasks`)
      .send({ title: "Record demo" });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);

    const update = await agent
      .patch(
        `/api/projects/${projectId}/tasks/${taskId}/subtasks/${first.body.data.subtask.id}`,
      )
      .send({ completed: true });
    expect(update.statusCode).toBe(200);
    expect(update.body.data.subtask.completed).toBe(true);

    const details = await agent.get(
      `/api/projects/${projectId}/tasks/${taskId}`,
    );
    expect(details.statusCode).toBe(200);
    expect(details.body.data.task.subtasks).toHaveLength(2);

    const remove = await agent.delete(
      `/api/projects/${projectId}/tasks/${taskId}/subtasks/${second.body.data.subtask.id}`,
    );
    expect(remove.statusCode).toBe(204);
  });

  it("adds comments with the current author and deletes them", async () => {
    const created = await agent
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .send({ body: "The demo is ready for review." });

    expect(created.statusCode).toBe(201);
    expect(created.body.data.comment.author.name).toBe(user.name);

    const details = await agent.get(
      `/api/projects/${projectId}/tasks/${taskId}`,
    );
    expect(details.body.data.task.comments[0].body).toBe(
      "The demo is ready for review.",
    );

    const removed = await agent.delete(
      `/api/projects/${projectId}/tasks/${taskId}/comments/${created.body.data.comment.id}`,
    );
    expect(removed.statusCode).toBe(204);
  });

  it("validates empty subtasks and comments", async () => {
    const subtask = await agent
      .post(`/api/projects/${projectId}/tasks/${taskId}/subtasks`)
      .send({ title: "  " });
    const comment = await agent
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .send({ body: "" });

    expect(subtask.statusCode).toBe(422);
    expect(comment.statusCode).toBe(422);
  });
});
