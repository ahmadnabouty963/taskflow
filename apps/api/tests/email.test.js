import { jest } from "@jest/globals";
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendWorkspaceInvitationEmail,
} from "../src/lib/email.js";

const originalFetch = global.fetch;
const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;
const originalClientUrl = process.env.CLIENT_APP_URL;
const originalEmailTestMode = process.env.EMAIL_TEST_MODE;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = originalFrom;
  if (originalClientUrl === undefined) delete process.env.CLIENT_APP_URL;
  else process.env.CLIENT_APP_URL = originalClientUrl;
  if (originalEmailTestMode === undefined) delete process.env.EMAIL_TEST_MODE;
  else process.env.EMAIL_TEST_MODE = originalEmailTestMode;
});

function mockResend() {
  process.env.EMAIL_TEST_MODE = "delivery";
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.EMAIL_FROM = "Ordanly <hello@ordanly.com>";
  process.env.CLIENT_APP_URL = "https://ordanly.com/";
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: "email-1" }),
  });
}

function sentBody() {
  return JSON.parse(global.fetch.mock.calls[0][1].body);
}

describe("Transactional email delivery", () => {
  it("sends a domain invitation email with the private link", async () => {
    mockResend();
    await sendWorkspaceInvitationEmail({
      invitationId: "invitation-1",
      token: "private-token",
      email: "member@example.com",
      inviterName: "Ahmad Nabouty",
      workspaceName: "Product team",
      role: "MEMBER",
    });
    expect(sentBody().html).toContain("https://ordanly.com/invite/private-token");
    expect(sentBody().text).toContain("expires in 7 days");
  });

  it("sends email verification and password reset links", async () => {
    mockResend();
    await sendEmailVerificationEmail({
      tokenId: "verify-1",
      token: "verification-token",
      email: "member@example.com",
      name: "Ahmad",
    });
    expect(sentBody().html).toContain(
      "https://ordanly.com/verify-email/verification-token",
    );

    mockResend();
    await sendPasswordResetEmail({
      tokenId: "reset-1",
      token: "reset-token",
      email: "member@example.com",
      name: "Ahmad",
    });
    expect(sentBody().html).toContain(
      "https://ordanly.com/reset-password/reset-token",
    );
    expect(sentBody().text).toContain("60 minutes");
  });

  it("fails safely when Resend rejects a request", async () => {
    process.env.EMAIL_TEST_MODE = "delivery";
    process.env.RESEND_API_KEY = "re_test_key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Rejected sender" }),
    });
    await expect(sendPasswordResetEmail({
      tokenId: "reset-2",
      token: "private-token",
      email: "member@example.com",
      name: "Ahmad",
    })).rejects.toThrow("Rejected sender");
  });
});
