import { z } from "zod";

const workspaceName = z
  .string()
  .trim()
  .min(2, "Workspace name must contain at least 2 characters.")
  .max(80, "Workspace name must not exceed 80 characters.");

export const createWorkspaceSchema = z.object({ name: workspaceName });
export const updateWorkspaceSchema = z.object({ name: workspaceName });

export const workspaceIdParamsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

export const memberParamsSchema = workspaceIdParamsSchema.extend({
  userId: z.string().uuid("User ID must be a valid UUID."),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});
