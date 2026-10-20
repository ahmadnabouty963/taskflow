import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Planning Owner",
  email: "planning-owner@example.com",
  password: "StrongPass123",
};

const otherUser = {
  name: "Planning Other",
  email: "planning-other@example.com",
  password: "StrongPass123",
};

async function deleteTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [owner.email, otherUser.email],
      },
    },
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

async function createProject(agent, title) {
  const response = await agent.post("/api/projects").send({ title });
  return response.body.data.project;
}

async function createTask(agent, projectId, task) {
  return agent.post("/api/projects/" + projectId + "/tasks").send(task);
}

let ownerAgent;
let otherAgent;

beforeEach(async () => {
  await deleteTestUsers();
  ownerAgent = await registerAndLogin(owner);
  otherAgent = await registerAndLogin(otherUser);
});

afterEach(deleteTestUsers);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Global planning API", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await request(app).get("/api/tasks");

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns only the owner's tasks in the requested date range", async () => {
    const ownerProject = await createProject(ownerAgent, "Owner Project");
    const otherProject = await createProject(otherAgent, "Private Project");

    await createTask(ownerAgent, ownerProject.id, {
      title: "Due today",
      dueDate: "2026-10-20T12:00:00.000Z",
    });
    await createTask(ownerAgent, ownerProject.id, {
      title: "Due later",
      dueDate: "2026-10-25T12:00:00.000Z",
    });
    await createTask(otherAgent, otherProject.id, {
      title: "Other user task",
      dueDate: "2026-10-20T12:00:00.000Z",
    });

    const response = await ownerAgent.get(
      "/api/tasks" +
        "?from=2026-10-20T00%3A00%3A00.000Z" +
        "&to=2026-10-21T00%3A00%3A00.000Z",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.data.tasks).toHaveLength(1);
    expect(response.body.data.tasks[0]).toMatchObject({
      title: "Due today",
      project: {
        id: ownerProject.id,
        title: "Owner Project",
      },
    });
  });

  it("can exclude completed tasks", async () => {
    const project = await createProject(ownerAgent, "Status Project");

    await createTask(ownerAgent, project.id, {
      title: "Open task",
      status: "IN_PROGRESS",
      dueDate: "2026-10-20T12:00:00.000Z",
    });
    await createTask(ownerAgent, project.id, {
      title: "Completed task",
      status: "DONE",
      dueDate: "2026-10-20T13:00:00.000Z",
    });

    const response = await ownerAgent.get(
      "/api/tasks?excludeStatus=DONE&limit=100",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.data.tasks).toHaveLength(1);
    expect(response.body.data.tasks[0].title).toBe("Open task");
  });

  it("rejects an invalid date range", async () => {
    const response = await ownerAgent.get(
      "/api/tasks" +
        "?from=2026-10-21T00%3A00%3A00.000Z" +
        "&to=2026-10-20T00%3A00%3A00.000Z",
    );

    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
