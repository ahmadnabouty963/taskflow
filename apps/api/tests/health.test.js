import request from "supertest";
import app from "../src/app.js";

describe("GET /api/health", () => {
  it("returns the API health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok",
        service: "taskflow-api",
      },
    });
  });
});

describe("Unknown routes", () => {
  it("returns a consistent JSON 404 response", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.statusCode).toBe(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route not found.",
      },
    });
  });
});
