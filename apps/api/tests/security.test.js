import request from "supertest";
import app from "../src/app.js";

describe("API security configuration", () => {
  it("sets security headers and hides Express", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toBeDefined();
  });

  it("allows a configured CORS origin with credentials", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5500");

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5500",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not grant CORS permission to another origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://evil.example");

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
