import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Workspace Owner",
  email: "workspace-owner@example.com",
  password: "StrongPass123",
};
const teammate = {
  name: "Workspace Member",
  email: "workspace-member@example.com",
  password: "StrongPass123",
};

async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { in: [owner.email, teammate.email] } },
  });
}

async function registerAndLogin(user) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user).expect(201);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password })
    .expect(200);
  return agent;
}

beforeEach(cleanup);
afterEach(cleanup);
afterAll(() => prisma.$disconnect());

describe("Workspaces API", () => {
  it("creates a personal workspace during registration", async () => {
    const agent = await registerAndLogin(owner);
    const response = await agent.get("/api/workspaces");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.workspaces).toEqual([
      expect.objectContaining({ type: "PERSONAL", role: "OWNER" }),
    ]);
  });

  it("creates a team and lets the owner add an existing account", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const memberAgent = await registerAndLogin(teammate);

    const createResponse = await ownerAgent
      .post("/api/workspaces")
      .send({ name: "Release team" });
    expect(createResponse.statusCode).toBe(201);
    const workspaceId = createResponse.body.data.workspace.id;

    const addResponse = await ownerAgent
      .post(`/api/workspaces/${workspaceId}/members`)
      .send({ email: teammate.email, role: "MEMBER" });
    expect(addResponse.statusCode).toBe(201);
    expect(addResponse.body.data.member.role).toBe("MEMBER");

    const memberList = await memberAgent.get("/api/workspaces");
    expect(memberList.body.data.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: workspaceId, role: "MEMBER" }),
      ]),
    );

    const projectResponse = await memberAgent.post("/api/projects").send({
      title: "Shared launch",
      workspaceId,
    });
    expect(projectResponse.statusCode).toBe(201);

    const ownerProjects = await ownerAgent.get("/api/projects");
    expect(ownerProjects.body.data.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Shared launch",
          workspaceId,
        }),
      ]),
    );
  });

  it("keeps viewers read-only", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const viewerAgent = await registerAndLogin(teammate);
    const created = await ownerAgent
      .post("/api/workspaces")
      .send({ name: "Read only team" });
    const workspaceId = created.body.data.workspace.id;

    await ownerAgent
      .post(`/api/workspaces/${workspaceId}/members`)
      .send({ email: teammate.email, role: "VIEWER" })
      .expect(201);

    const forbidden = await viewerAgent.post("/api/projects").send({
      title: "Viewer project",
      workspaceId,
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.body.error.code).toBe("WORKSPACE_PERMISSION_DENIED");
  });

  it("allows managers to change roles and remove members", async () => {
    const ownerAgent = await registerAndLogin(owner);
    await registerAndLogin(teammate);
    const teammateUser = await prisma.user.findUnique({
      where: { email: teammate.email },
    });
    const created = await ownerAgent
      .post("/api/workspaces")
      .send({ name: "Operations" });
    const workspaceId = created.body.data.workspace.id;

    await ownerAgent
      .post(`/api/workspaces/${workspaceId}/members`)
      .send({ email: teammate.email, role: "MEMBER" })
      .expect(201);

    const update = await ownerAgent
      .patch(`/api/workspaces/${workspaceId}/members/${teammateUser.id}`)
      .send({ role: "ADMIN" });
    expect(update.statusCode).toBe(200);
    expect(update.body.data.member.role).toBe("ADMIN");

    await ownerAgent
      .delete(`/api/workspaces/${workspaceId}/members/${teammateUser.id}`)
      .expect(204);
  });
});
