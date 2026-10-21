import argon2 from "argon2";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAuthToken, hashAuthToken } from "../src/lib/auth-token.js";

const email = "auth-security@example.com";
const password = "StrongPass123";

async function createUser({ verified = false } = {}) {
  return prisma.user.create({
    data: {
      name: "Security Test",
      email,
      passwordHash: await argon2.hash(password),
      emailVerifiedAt: verified ? new Date() : null,
    },
  });
}

async function createToken(userId, type) {
  const token = createAuthToken();
  await prisma.authToken.create({
    data: {
      tokenHash: hashAuthToken(token),
      type,
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
}

beforeEach(() => prisma.user.deleteMany({ where: { email } }));
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("Email verification and password recovery", () => {
  it("blocks login until the email address is verified", async () => {
    await createUser();
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    expect(response.statusCode).toBe(403);
    expect(response.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("verifies an email with a one-time token", async () => {
    const user = await createUser();
    const token = await createToken(user.id, "EMAIL_VERIFICATION");
    await request(app)
      .post("/api/auth/verify-email")
      .send({ token })
      .expect(200);
    expect((await prisma.user.findUnique({ where: { id: user.id } })).emailVerifiedAt)
      .toBeInstanceOf(Date);
    await request(app)
      .post("/api/auth/verify-email")
      .send({ token })
      .expect(410);
  });

  it("does not reveal whether a password-reset address exists", async () => {
    const user = await createUser({ verified: true });
    const existing = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email });
    const missing = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "missing-auth-security@example.com" });
    expect(existing.statusCode).toBe(202);
    expect(missing.statusCode).toBe(202);
    expect(existing.body.data.message).toBe(missing.body.data.message);
    expect(await prisma.authToken.count({
      where: { userId: user.id, type: "PASSWORD_RESET" },
    })).toBe(1);
  });

  it("resets the password once and invalidates existing sessions", async () => {
    const user = await createUser({ verified: true });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    const token = await createToken(user.id, "PASSWORD_RESET");

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "NewStrongPass456" })
      .expect(204);

    await agent.get("/api/auth/me").expect(401);
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "AnotherStrongPass789" })
      .expect(410);
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "NewStrongPass456" })
      .expect(200);
  });
});
