import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { memoryStorage } from "../src/lib/storage.js";

const admin = { name: "Platform Admin", email: "platform-admin@example.com", password: "StrongPass123" };
const member = { name: "Regular Member", email: "regular-member@example.com", password: "StrongPass123" };
const emails = [admin.email, member.email];
const chromeOnAndroid =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

async function registerAndLogin(user, headers = {}) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(user);
  await agent.post("/api/auth/login").set(headers).send({ email: user.email, password: user.password });
  return agent;
}

async function loginAgain(user) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
  return { agent, response };
}

let adminAgent;
let memberAgent;
let memberId;

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  memoryStorage.clear();
  adminAgent = await registerAndLogin(admin);
  memberAgent = await registerAndLogin(member, {
    "User-Agent": chromeOnAndroid,
    "X-Forwarded-For": "85.214.132.117",
  });
  await prisma.user.update({ where: { email: admin.email }, data: { isPlatformAdmin: true } });
  memberId = (await prisma.user.findUnique({ where: { email: member.email } })).id;
});

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Login tracking", () => {
  it("stores country, device and browser but not the IP address", async () => {
    const stored = await prisma.user.findUnique({ where: { id: memberId } });

    expect(stored).toMatchObject({
      lastLoginCountry: "DE",
      lastLoginDevice: "MOBILE",
      lastLoginBrowser: "Chrome",
    });
    expect(stored.lastLoginAt).toBeInstanceOf(Date);
    expect(JSON.stringify(stored)).not.toContain("85.214.132.117");
  });

  it("tells the app who is a platform admin", async () => {
    const asAdmin = await adminAgent.get("/api/auth/me");
    const asMember = await memberAgent.get("/api/auth/me");

    expect(asAdmin.body.data.user.isPlatformAdmin).toBe(true);
    expect(asMember.body.data.user.isPlatformAdmin).toBe(false);
  });
});

describe("Admin API access", () => {
  it("is closed to regular users and guests", async () => {
    const asMember = await memberAgent.get("/api/admin/overview");
    const asGuest = await request(app).get("/api/admin/users");

    expect(asMember.statusCode).toBe(403);
    expect(asMember.body.error.code).toBe("ADMIN_REQUIRED");
    expect(asGuest.statusCode).toBe(401);
  });
});

describe("Admin overview", () => {
  it("returns counts without user content", async () => {
    await memberAgent.post("/api/projects").send({ title: "Secret project name" });

    const response = await adminAgent.get("/api/admin/overview");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.users.total).toBeGreaterThanOrEqual(2);
    expect(response.body.data.content.projects).toBeGreaterThanOrEqual(1);
    expect(response.body.data.countries).toEqual(expect.arrayContaining([{ value: "DE", count: expect.any(Number) }]));
    expect(response.body.data.signups.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(response.body)).not.toContain("Secret project name");
  });
});

describe("Admin user list", () => {
  it("searches users and shows their metadata", async () => {
    const response = await adminAgent.get("/api/admin/users?search=regular-member");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.users).toHaveLength(1);
    expect(response.body.data.users[0]).toMatchObject({
      email: member.email,
      lastLoginCountry: "DE",
      lastLoginDevice: "MOBILE",
      workspaces: 1,
      projects: 0,
      storageBytes: 0,
      isCurrentUser: false,
    });
    expect(response.body.data.users[0].passwordHash).toBeUndefined();
  });

  it("filters blocked users", async () => {
    await adminAgent.patch(`/api/admin/users/${memberId}`).send({ blocked: true });

    const response = await adminAgent.get("/api/admin/users?status=blocked&search=@example.com");

    expect(response.body.data.users.map(({ email }) => email)).toContain(member.email);
    expect(response.body.data.users.map(({ email }) => email)).not.toContain(admin.email);
  });
});

describe("Blocking users", () => {
  it("ends existing sessions and prevents new logins until unblocked", async () => {
    const block = await adminAgent.patch(`/api/admin/users/${memberId}`).send({ blocked: true });
    expect(block.statusCode).toBe(200);

    const oldSession = await memberAgent.get("/api/auth/me");
    expect(oldSession.statusCode).toBe(401);

    const blockedLogin = await loginAgain(member);
    expect(blockedLogin.response.statusCode).toBe(403);
    expect(blockedLogin.response.body.error.code).toBe("ACCOUNT_BLOCKED");

    await adminAgent.patch(`/api/admin/users/${memberId}`).send({ blocked: false });
    const allowedLogin = await loginAgain(member);
    expect(allowedLogin.response.statusCode).toBe(200);
  });

  it("does not let admins block themselves", async () => {
    const adminId = (await prisma.user.findUnique({ where: { email: admin.email } })).id;

    const response = await adminAgent.patch(`/api/admin/users/${adminId}`).send({ blocked: true });

    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("CANNOT_MANAGE_SELF");
  });
});

describe("Deleting users", () => {
  it("requires the matching email and removes the account with its files", async () => {
    const project = await memberAgent.post("/api/projects").send({ title: "Files" });
    const task = await memberAgent.post(`/api/projects/${project.body.data.project.id}/tasks`).send({ title: "Scan" });
    const path = `/api/projects/${project.body.data.project.id}/tasks/${task.body.data.task.id}/attachments`;
    const started = await memberAgent.post(path).send({ fileName: "a.pdf", contentType: "application/pdf", size: 10 });
    const attachment = await prisma.attachment.findUnique({ where: { id: started.body.data.attachment.id } });
    memoryStorage.set(attachment.storageKey, { size: 10, contentType: "application/pdf" });
    await memberAgent.post(`/api/attachments/${attachment.id}/complete`);

    const wrong = await adminAgent.delete(`/api/admin/users/${memberId}`).send({ confirmEmail: "someone@example.com" });
    expect(wrong.statusCode).toBe(422);
    expect(wrong.body.error.code).toBe("CONFIRMATION_MISMATCH");

    const deleted = await adminAgent.delete(`/api/admin/users/${memberId}`).send({ confirmEmail: member.email.toUpperCase() });
    expect(deleted.statusCode).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: memberId } })).toBeNull();
    expect(memoryStorage.size).toBe(0);
  });

  it("protects other administrators", async () => {
    await prisma.user.update({ where: { id: memberId }, data: { isPlatformAdmin: true } });

    const response = await adminAgent.delete(`/api/admin/users/${memberId}`).send({ confirmEmail: member.email });

    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe("CANNOT_MANAGE_ADMIN");
  });
});
