import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = { name: "Label Owner", email: "label-owner@example.com", password: "StrongPass123" };
const member = { name: "Assigned Member", email: "assigned-member@example.com", password: "StrongPass123" };
const outsider = { name: "Outside User", email: "outside-label@example.com", password: "StrongPass123" };

async function registerAndLogin(user) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user).expect(201);
  await agent.post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);
  return agent;
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [owner.email, member.email, outsider.email] } } });
}

beforeEach(cleanup);
afterEach(cleanup);
afterAll(() => prisma.$disconnect());

describe("Task labels and responsible people", () => {
  it("assigns workspace members, attaches labels and filters tasks", async () => {
    const ownerAgent = await registerAndLogin(owner);
    await registerAndLogin(member);
    const memberUser = await prisma.user.findUnique({ where: { email: member.email } });
    const workspaceResponse = await ownerAgent.post("/api/workspaces").send({ name: "Design team" }).expect(201);
    const workspaceId = workspaceResponse.body.data.workspace.id;
    await prisma.workspaceMember.create({ data: { workspaceId, userId: memberUser.id, role: "MEMBER" } });
    const projectResponse = await ownerAgent.post("/api/projects").send({ title: "Brand refresh", workspaceId }).expect(201);
    const projectId = projectResponse.body.data.project.id;

    const labelResponse = await ownerAgent.post(`/api/workspaces/${workspaceId}/labels`).send({ name: "Design", color: "#E11D48" }).expect(201);
    const label = labelResponse.body.data.label;
    const options = await ownerAgent.get(`/api/projects/${projectId}/tasks/options`).expect(200);
    expect(options.body.data.members).toEqual(expect.arrayContaining([expect.objectContaining({ id: memberUser.id, role: "MEMBER" })]));

    const created = await ownerAgent.post(`/api/projects/${projectId}/tasks`).send({
      title: "Prepare visual system", assigneeId: memberUser.id, labelIds: [label.id],
    }).expect(201);
    expect(created.body.data.task.assignee.name).toBe(member.name);
    expect(created.body.data.task.labels).toEqual([expect.objectContaining({ name: "Design", color: "#E11D48" })]);

    const filtered = await ownerAgent.get(`/api/projects/${projectId}/tasks?assigneeId=${memberUser.id}&labelId=${label.id}`).expect(200);
    expect(filtered.body.data.tasks).toHaveLength(1);
    expect(filtered.body.data.tasks[0].title).toBe("Prepare visual system");
  });

  it("rejects responsible people from another workspace", async () => {
    const ownerAgent = await registerAndLogin(owner);
    await registerAndLogin(outsider);
    const outsideUser = await prisma.user.findUnique({ where: { email: outsider.email } });
    const project = (await ownerAgent.post("/api/projects").send({ title: "Private plan" })).body.data.project;
    const response = await ownerAgent.post(`/api/projects/${project.id}/tasks`).send({ title: "Protected assignment", assigneeId: outsideUser.id });
    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("ASSIGNEE_NOT_IN_WORKSPACE");
  });
});
