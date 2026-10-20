import { z } from "zod";

export const invitationTokenParamsSchema = z.object({
  token: z.string().min(20, "Invitation token is invalid.").max(200),
});

export const invitationIdParamsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  invitationId: z.string().uuid("Invitation ID must be a valid UUID."),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required."),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});
