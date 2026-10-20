import { jest } from "@jest/globals";
import { sendWorkspaceInvitationEmail } from "../src/lib/email.js";

const originalFetch = global.fetch;
const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;
const originalClientUrl = process.env.CLIENT_APP_URL;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = originalFrom;
  if (originalClientUrl === undefined) delete process.env.CLIENT_APP_URL;
  else process.env.CLIENT_APP_URL = originalClientUrl;
});

describe("Invitation email delivery", () => {
  it("sends a domain email containing the private invitation link", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Ordanly <hello@ordanly.com>";
    process.env.CLIENT_APP_URL = "https://ordanly.com/";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "email-1" }),
    });

    const result = await sendWorkspaceInvitationEmail({
      invitationId: "invitation-1",
      token: "private-token",
      email: "member@example.com",
      inviterName: "Ahmad Nabouty",
      workspaceName: "Product team",
      role: "MEMBER",
    });

    expect(result.id).toBe("email-1");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers.Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(options.body);
    expect(body.from).toBe("Ordanly <hello@ordanly.com>");
    expect(body.to).toEqual(["member@example.com"]);
    expect(body.html).toContain("https://ordanly.com/invite/private-token");
    expect(body.text).toContain("expires in 7 days");
  });

  it("fails safely when Resend rejects a request", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Rejected sender" }),
    });

    await expect(
      sendWorkspaceInvitationEmail({
        invitationId: "invitation-2",
        token: "private-token",
        email: "member@example.com",
        inviterName: "Ahmad",
        workspaceName: "Team",
        role: "VIEWER",
      }),
    ).rejects.toThrow("Rejected sender");
  });
});
