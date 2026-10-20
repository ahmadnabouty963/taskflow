import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sends JSON requests with the session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { project: { id: "project-1" } },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Website launch" }),
    });

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toContain("/api/projects");
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Content-Type")).toBe("application/json");
  });

  it("returns null for a 204 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 204,
      ok: true,
      json: vi.fn(),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/auth/logout", { method: "POST" }),
    ).resolves.toBeNull();

    expect(fetchMock.mock.results[0].value).toBeDefined();
  });

  it("throws the API error message for failed requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: vi.fn().mockResolvedValue({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password is incorrect.",
          },
        }),
      }),
    );

    await expect(
      apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "ahmad@example.com",
          password: "wrong-password",
        }),
      }),
    ).rejects.toThrow("Email or password is incorrect.");
  });
});
