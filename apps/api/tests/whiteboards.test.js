import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Board Owner",
  email: "board-owner@example.com",
  password: "StrongPass123",
};

const other = {
  name: "Board Other",
  email: "board-other@example.com",
  password: "StrongPass123",
};

const rectangle = { id: "shape-1", type: "rectangle", x: 10, y: 20, width: 100, height: 50 };

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

let ownerAgent;
let otherAgent;
let workspaceId;
let projectId;
let path;

async function addOther(role) {
  const otherUser = await prisma.user.findUnique({ where: { email: other.email } });
  await prisma.workspaceMember.create({
    data: { workspaceId, userId: otherUser.id, role },
  });
}

beforeEach(async () => {
  await deleteUsers();
  ownerAgent = await registerAndLogin(owner);
  otherAgent = await registerAndLogin(other);
  const workspace = await ownerAgent.post("/api/workspaces").send({ name: "Family" });
  workspaceId = workspace.body.data.workspace.id;
  const project = await ownerAgent
    .post("/api/projects")
    .send({ title: "Holiday planning", workspaceId });
  projectId = project.body.data.project.id;
  path = `/api/projects/${projectId}/whiteboard`;
});

afterEach(deleteUsers);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Whiteboards API", () => {
  it("returns an empty whiteboard before the first save", async () => {
    const response = await ownerAgent.get(path);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toMatchObject({
      whiteboard: { elements: [], version: 0 },
      canEdit: true,
    });
  });

  it("saves drawings with an increasing version", async () => {
    const first = await ownerAgent.put(path).send({ elements: [rectangle], baseVersion: 0 });
    const second = await ownerAgent
      .put(path)
      .send({ elements: [rectangle, { ...rectangle, id: "shape-2" }], baseVersion: 1 });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.body.data.whiteboard.version).toBe(2);
    expect(second.body.data.whiteboard.updatedBy.name).toBe(owner.name);

    const loaded = await ownerAgent.get(path);
    expect(loaded.body.data.whiteboard.elements).toHaveLength(2);
    expect(loaded.body.data.whiteboard.elements[0]).toMatchObject(rectangle);
  });

  it("rejects saves based on an outdated version", async () => {
    await addOther("MEMBER");
    await ownerAgent.put(path).send({ elements: [rectangle], baseVersion: 0 });

    const stale = await otherAgent.put(path).send({ elements: [], baseVersion: 0 });

    expect(stale.statusCode).toBe(409);
    expect(stale.body.error.code).toBe("WHITEBOARD_CONFLICT");
    expect(stale.body.data.whiteboard.elements).toHaveLength(1);
  });

  it("lets viewers read but not change the whiteboard", async () => {
    await addOther("VIEWER");
    await ownerAgent.put(path).send({ elements: [rectangle], baseVersion: 0 });

    const read = await otherAgent.get(path);
    const write = await otherAgent.put(path).send({ elements: [], baseVersion: 1 });

    expect(read.statusCode).toBe(200);
    expect(read.body.data.canEdit).toBe(false);
    expect(read.body.data.whiteboard.elements).toHaveLength(1);
    expect(write.statusCode).toBe(403);
  });

  it("hides whiteboards from people outside the workspace", async () => {
    const read = await otherAgent.get(path);
    const write = await otherAgent.put(path).send({ elements: [rectangle], baseVersion: 0 });

    expect(read.statusCode).toBe(404);
    expect(write.statusCode).toBe(404);
  });

  it("rejects images and unsafe links", async () => {
    const image = await ownerAgent
      .put(path)
      .send({ elements: [{ id: "image-1", type: "image" }], baseVersion: 0 });
    const script = await ownerAgent
      .put(path)
      .send({ elements: [{ ...rectangle, link: "javascript:alert(1)" }], baseVersion: 0 });

    expect(image.statusCode).toBe(422);
    expect(script.statusCode).toBe(422);
  });

  it("accepts drawings larger than the normal request limit", async () => {
    const elements = Array.from({ length: 400 }, (_, index) => ({
      ...rectangle,
      id: `shape-${index}`,
      text: "x".repeat(40),
    }));

    const response = await ownerAgent.put(path).send({ elements, baseVersion: 0 });

    expect(JSON.stringify({ elements }).length).toBeGreaterThan(10 * 1024);
    expect(response.statusCode).toBe(200);
  });

  it("answers oversized drawings with 413", async () => {
    const elements = [{ ...rectangle, text: "x".repeat(2.5 * 1024 * 1024) }];

    const response = await ownerAgent.put(path).send({ elements, baseVersion: 0 });

    expect(response.statusCode).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
