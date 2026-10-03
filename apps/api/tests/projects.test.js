import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Project Owner",
  email: "project-owner@example.com",
  password: "StrongPass123",
};

const otherUser = {
  name: "Other User",
  email: "project-other@example.com",
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

describe("Projects API", () => {
  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/projects");

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("allows the owner to complete the project CRUD flow", async () => {
    const createResponse = await ownerAgent.post("/api/projects").send({
      title: "Integration Test Project",
      description: "Created by an integration test",
    });

    expect(createResponse.statusCode).toBe(201);

    const projectId = createResponse.body.data.project.id;

    const listResponse = await ownerAgent.get("/api/projects");

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.data.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: projectId,
          title: "Integration Test Project",
        }),
      ]),
    );

    const getResponse = await ownerAgent.get(`/api/projects/${projectId}`);

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.data.project.id).toBe(projectId);

    const updateResponse = await ownerAgent
      .patch(`/api/projects/${projectId}`)
      .send({
        title: "Updated Integration Project",
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.data.project.title).toBe(
      "Updated Integration Project",
    );

    const deleteResponse = await ownerAgent.delete(
      `/api/projects/${projectId}`,
    );

    expect(deleteResponse.statusCode).toBe(204);

    const afterDeleteResponse = await ownerAgent.get(
      `/api/projects/${projectId}`,
    );

    expect(afterDeleteResponse.statusCode).toBe(404);
  });

  it("prevents another user from accessing the project", async () => {
    const createResponse = await ownerAgent.post("/api/projects").send({
      title: "Private Project",
    });

    const projectId = createResponse.body.data.project.id;

    const getResponse = await otherAgent.get(`/api/projects/${projectId}`);

    expect(getResponse.statusCode).toBe(404);

    const updateResponse = await otherAgent
      .patch(`/api/projects/${projectId}`)
      .send({
        title: "Unauthorized update",
      });

    expect(updateResponse.statusCode).toBe(404);

    const deleteResponse = await otherAgent.delete(
      `/api/projects/${projectId}`,
    );

    expect(deleteResponse.statusCode).toBe(404);

    const ownerResponse = await ownerAgent.get(`/api/projects/${projectId}`);

    expect(ownerResponse.statusCode).toBe(200);
    expect(ownerResponse.body.data.project.title).toBe("Private Project");
  });
});
