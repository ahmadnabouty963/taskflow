import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Task Owner",
  email: "task-owner@example.com",
  password: "StrongPass123",
};

const otherUser = {
  name: "Other Task User",
  email: "task-other@example.com",
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

  const registerResponse = await agent.post("/api/auth/register").send(user);

  if (registerResponse.statusCode !== 201) {
    throw new Error(`Test registration failed: ${registerResponse.statusCode}`);
  }

  const loginResponse = await agent.post("/api/auth/login").send({
    email: user.email,
    password: user.password,
  });

  if (loginResponse.statusCode !== 200) {
    throw new Error(`Test login failed: ${loginResponse.statusCode}`);
  }

  return agent;
}

async function createProject(agent) {
  const response = await agent.post("/api/projects").send({
    title: "Task Test Project",
  });

  return response.body.data.project;
}

let ownerAgent;
let otherAgent;

beforeEach(async () => {
  await deleteTestUsers();

  ownerAgent = await registerAndLogin(owner);
  otherAgent = await registerAndLogin(otherUser);
});

afterEach(async () => {
  await deleteTestUsers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Tasks API", () => {
  it("rejects unauthenticated access", async () => {
    const projectId = "00000000-0000-4000-8000-000000000000";

    const response = await request(app).get(`/api/projects/${projectId}/tasks`);

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("allows the owner to complete the task CRUD flow", async () => {
    const project = await createProject(ownerAgent);

    const createResponse = await ownerAgent
      .post(`/api/projects/${project.id}/tasks`)
      .send({
        title: "Integration Test Task",
        description: "Test the complete task flow",
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.data.task).toMatchObject({
      title: "Integration Test Task",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project.id,
    });

    const taskId = createResponse.body.data.task.id;

    const listResponse = await ownerAgent.get(
      `/api/projects/${project.id}/tasks`,
    );

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.data.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: taskId,
        }),
      ]),
    );

    const getResponse = await ownerAgent.get(
      `/api/projects/${project.id}/tasks/${taskId}`,
    );

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.data.task.id).toBe(taskId);

    const updateResponse = await ownerAgent
      .patch(`/api/projects/${project.id}/tasks/${taskId}`)
      .send({
        title: "Completed Integration Task",
        status: "DONE",
        priority: "HIGH",
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.data.task).toMatchObject({
      title: "Completed Integration Task",
      status: "DONE",
      priority: "HIGH",
    });

    const deleteResponse = await ownerAgent.delete(
      `/api/projects/${project.id}/tasks/${taskId}`,
    );

    expect(deleteResponse.statusCode).toBe(204);

    const afterDeleteResponse = await ownerAgent.get(
      `/api/projects/${project.id}/tasks/${taskId}`,
    );

    expect(afterDeleteResponse.statusCode).toBe(404);
  });

  it("rejects invalid task input", async () => {
    const project = await createProject(ownerAgent);

    const response = await ownerAgent
      .post(`/api/projects/${project.id}/tasks`)
      .send({
        title: "",
        status: "FINISHED",
        priority: "URGENT",
      });

    expect(response.statusCode).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("prevents another user from accessing owner tasks", async () => {
    const project = await createProject(ownerAgent);

    const createResponse = await ownerAgent
      .post(`/api/projects/${project.id}/tasks`)
      .send({
        title: "Private Task",
      });

    const taskId = createResponse.body.data.task.id;

    const listResponse = await otherAgent.get(
      `/api/projects/${project.id}/tasks`,
    );

    expect(listResponse.statusCode).toBe(404);

    const getResponse = await otherAgent.get(
      `/api/projects/${project.id}/tasks/${taskId}`,
    );

    expect(getResponse.statusCode).toBe(404);

    const updateResponse = await otherAgent
      .patch(`/api/projects/${project.id}/tasks/${taskId}`)
      .send({
        status: "DONE",
      });

    expect(updateResponse.statusCode).toBe(404);

    const deleteResponse = await otherAgent.delete(
      `/api/projects/${project.id}/tasks/${taskId}`,
    );

    expect(deleteResponse.statusCode).toBe(404);

    const ownerResponse = await ownerAgent.get(
      `/api/projects/${project.id}/tasks/${taskId}`,
    );

    expect(ownerResponse.statusCode).toBe(200);
    expect(ownerResponse.body.data.task.title).toBe("Private Task");
  });
});
