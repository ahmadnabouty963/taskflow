import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

const account = {
  name: "Account Test User",
  email: "account-settings@example.com",
  password: "StrongPass123",
};

async function deleteTestAccount() {
  await prisma.user.deleteMany({
    where: {
      email: account.email,
    },
  });
}

async function createLoggedInAgent(password = account.password) {
  const agent = request.agent(app);

  const response = await agent.post("/api/auth/login").send({
    email: account.email,
    password,
  });

  expect(response.statusCode).toBe(200);
  return agent;
}

beforeEach(async () => {
  await deleteTestAccount();

  const response = await request(app)
    .post("/api/auth/register")
    .send(account);

  expect(response.statusCode).toBe(201);
});

afterAll(async () => {
  await deleteTestAccount();
  await prisma.$disconnect();
});

describe("Account settings API", () => {
  it("updates the authenticated user's name", async () => {
    const agent = await createLoggedInAgent();

    const response = await agent.patch("/api/auth/me").send({
      name: "Updated Account Name",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.data.user).toMatchObject({
      name: "Updated Account Name",
      email: account.email,
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects a wrong current password", async () => {
    const agent = await createLoggedInAgent();

    const response = await agent.patch("/api/auth/password").send({
      currentPassword: "WrongPassword123",
      newPassword: "NewStrongPass456",
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("INVALID_PASSWORD");
  });

  it("changes the password and invalidates other sessions", async () => {
    const firstDevice = await createLoggedInAgent();
    const currentDevice = await createLoggedInAgent();

    const response = await currentDevice.patch("/api/auth/password").send({
      currentPassword: account.password,
      newPassword: "NewStrongPass456",
    });

    expect(response.statusCode).toBe(204);

    const firstDeviceResponse = await firstDevice.get("/api/auth/me");
    const currentDeviceResponse = await currentDevice.get("/api/auth/me");

    expect(firstDeviceResponse.statusCode).toBe(401);
    expect(currentDeviceResponse.statusCode).toBe(200);

    const oldPasswordResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: account.email,
        password: account.password,
      });

    expect(oldPasswordResponse.statusCode).toBe(401);

    const newPasswordResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: account.email,
        password: "NewStrongPass456",
      });

    expect(newPasswordResponse.statusCode).toBe(200);
  });

  it("logs out all sessions except the current one", async () => {
    const otherDevice = await createLoggedInAgent();
    const currentDevice = await createLoggedInAgent();

    const response = await currentDevice.post("/api/auth/logout-others");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.signedOutSessions).toBeGreaterThanOrEqual(1);

    expect((await otherDevice.get("/api/auth/me")).statusCode).toBe(401);
    expect((await currentDevice.get("/api/auth/me")).statusCode).toBe(200);
  });

  it("requires the password before deleting the account", async () => {
    const agent = await createLoggedInAgent();

    const wrongPasswordResponse = await agent.delete("/api/auth/me").send({
      password: "WrongPassword123",
    });

    expect(wrongPasswordResponse.statusCode).toBe(401);

    const deleteResponse = await agent.delete("/api/auth/me").send({
      password: account.password,
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect((await agent.get("/api/auth/me")).statusCode).toBe(401);

    const deletedUser = await prisma.user.findUnique({
      where: {
        email: account.email,
      },
    });

    expect(deletedUser).toBeNull();
  });
});
