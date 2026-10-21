import { createHash, randomBytes } from "node:crypto";

const EMAIL_VERIFICATION_HOURS = 24;
const PASSWORD_RESET_MINUTES = 60;

export function createAuthToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAuthToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAuthTokenExpiry(type) {
  const duration = type === "EMAIL_VERIFICATION"
    ? EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000
    : PASSWORD_RESET_MINUTES * 60 * 1000;

  return new Date(Date.now() + duration);
}
