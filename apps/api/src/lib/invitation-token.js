import { createHash, randomBytes } from "node:crypto";

export const INVITATION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationExpiry() {
  return new Date(Date.now() + INVITATION_DURATION_MS);
}
