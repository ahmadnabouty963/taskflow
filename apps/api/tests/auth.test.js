import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const testUser = {
  name: "Integration Test User",
  email: "integration-auth@example.com",
  password: "StrongPass123",
};

async function deleteTestUser() {
  await prisma.user.deleteMany({
    where: {
      email: testUser.email,
    },
  });
}

beforeEach(async () => {
  await deleteTestUser();
});

afterAll(async () => {
  await deleteTestUser();
  await prisma.$disconnect();
});

describe("Auth API", () => {
  it("registers a valid user without exposing passwordHash", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      name: testUser.name,
      email: testUser.email,
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects invalid registration data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "",
      email: "not-an-email",
      password: "short",
    });

    expect(response.statusCode).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a duplicate email address", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const response = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("logs in, reads the current user and logs out", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(testUser);

    const loginResponse = await agent.post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginResponse.statusCode).toBe(200);

    const cookies = loginResponse.headers["set-cookie"];

    expect(cookies).toBeDefined();
    expect(cookies.join(";")).toContain("session_token=");
    expect(cookies.join(";")).toContain("HttpOnly");

    const meResponse = await agent.get("/api/auth/me");

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body.data.user.email).toBe(testUser.email);

    const logoutResponse = await agent.post("/api/auth/logout");

    expect(logoutResponse.statusCode).toBe(204);

    const afterLogoutResponse = await agent.get("/api/auth/me");

    expect(afterLogoutResponse.statusCode).toBe(401);
  });
});
