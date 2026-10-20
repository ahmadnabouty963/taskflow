import { createHash } from "node:crypto";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const owner = {
  name: "Invitation Owner",
  email: "invitation-owner@example.com",
  password: "StrongPass123",
};
const guest = {
  name: "Invited Person",
  email: "invited-person@example.com",
  password: "StrongPass123",
};

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { in: [owner.email, guest.email] } },
  });
}

async function registerAndLogin(account) {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(account).expect(201);
  await agent
    .post("/api/auth/login")
    .send({ email: account.email, password: account.password })
    .expect(200);
  return agent;
}

async function createTeam(agent) {
  const response = await agent
    .post("/api/workspaces")
    .send({ name: "Invitation team" })
    .expect(201);
  return response.body.data.workspace;
}

beforeEach(cleanup);
afterEach(cleanup);
afterAll(() => prisma.$disconnect());

describe("Workspace invitations", () => {
  it("creates a private expiring invitation without exposing its token", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const workspace = await createTeam(ownerAgent);

    const response = await ownerAgent
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email: guest.email.toUpperCase(), role: "MEMBER" });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.invitation).toEqual(
      expect.objectContaining({ email: guest.email, role: "MEMBER" }),
    );
    expect(response.body.data.invitation.tokenHash).toBeUndefined();

    const stored = await prisma.workspaceInvitation.findUnique({
      where: { workspaceId_email: { workspaceId: workspace.id, email: guest.email } },
    });
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const list = await ownerAgent
      .get(`/api/workspaces/${workspace.id}/invitations`)
      .expect(200);
    expect(list.body.data.invitations).toHaveLength(1);
  });

  it("lets the matching account inspect and accept a valid invitation", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const workspace = await createTeam(ownerAgent);
    const guestAgent = await registerAndLogin(guest);
    const inviter = await prisma.user.findUnique({ where: { email: owner.email } });
    const token = "valid-invitation-token-that-is-long-enough";

    await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: guest.email,
        role: "ADMIN",
        tokenHash: hashToken(token),
        invitedById: inviter.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const preview = await request(app).get(`/api/invitations/${token}`).expect(200);
    expect(preview.body.data.invitation.workspace.name).toBe("Invitation team");
    expect(preview.body.data.invitation).not.toHaveProperty("tokenHash");

    const accepted = await guestAgent
      .post(`/api/invitations/${token}/accept`)
      .expect(200);
    expect(accepted.body.data.member.role).toBe("ADMIN");

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: accepted.body.data.member.userId,
        },
      },
    });
    expect(membership.role).toBe("ADMIN");
    expect(await prisma.workspaceInvitation.count()).toBe(0);
  });

  it("rejects acceptance from a different email address", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const workspace = await createTeam(ownerAgent);
    const ownerUser = await prisma.user.findUnique({ where: { email: owner.email } });
    const token = "email-mismatch-token-that-is-long-enough";

    await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: guest.email,
        role: "MEMBER",
        tokenHash: hashToken(token),
        invitedById: ownerUser.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await ownerAgent.post(`/api/invitations/${token}/accept`);
    expect(response.statusCode).toBe(403);
    expect(response.body.error.code).toBe("INVITATION_EMAIL_MISMATCH");
  });

  it("lets managers resend and revoke pending invitations", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const workspace = await createTeam(ownerAgent);
    await ownerAgent
      .post(`/api/workspaces/${workspace.id}/invitations`)
      .send({ email: guest.email, role: "VIEWER" })
      .expect(201);

    const before = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId: workspace.id },
    });
    const resent = await ownerAgent
      .post(`/api/workspaces/${workspace.id}/invitations/${before.id}/resend`)
      .expect(200);
    expect(resent.body.data.invitation.id).toBe(before.id);

    const after = await prisma.workspaceInvitation.findUnique({
      where: { id: before.id },
    });
    expect(after.tokenHash).not.toBe(before.tokenHash);

    await ownerAgent
      .delete(`/api/workspaces/${workspace.id}/invitations/${before.id}`)
      .expect(204);
    expect(await prisma.workspaceInvitation.count()).toBe(0);
  });

  it("declines valid invitations and rejects expired links", async () => {
    const ownerAgent = await registerAndLogin(owner);
    const workspace = await createTeam(ownerAgent);
    const inviter = await prisma.user.findUnique({ where: { email: owner.email } });
    const expiredToken = "expired-invitation-token-that-is-long-enough";

    await prisma.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: guest.email,
        role: "MEMBER",
        tokenHash: hashToken(expiredToken),
        invitedById: inviter.id,
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    await request(app).get(`/api/invitations/${expiredToken}`).expect(410);

    const validToken = "decline-invitation-token-that-is-long-enough";
    await prisma.workspaceInvitation.updateMany({
      where: { workspaceId: workspace.id },
      data: {
        tokenHash: hashToken(validToken),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await request(app).post(`/api/invitations/${validToken}/decline`).expect(204);
    expect(await prisma.workspaceInvitation.count()).toBe(0);
  });
});
