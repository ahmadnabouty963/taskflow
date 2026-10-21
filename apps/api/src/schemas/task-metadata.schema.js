import { z } from "zod";

const labelColor = z
  .string()
  .regex(/^#[0-9A-F]{6}$/i, "Label color must be a six-digit hex color.");

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, "Label name is required.").max(40),
  color: labelColor,
});

export const labelParamsSchema = z.object({
  workspaceId: z.string().uuid("Workspace ID must be a valid UUID."),
  labelId: z.string().uuid("Label ID must be a valid UUID."),
});
