import { z } from "zod";

const projectColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Project color must be a valid hex color.");

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Project title is required.")
    .max(100, "Project title must not exceed 100 characters."),

  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters.")
    .optional(),

  color: projectColorSchema.optional(),
  workspaceId: z.string().min(1, "Workspace ID is required.").optional(),
});

export const projectIdParamsSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID."),
});

export const updateProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Project title must not be empty.")
      .max(100, "Project title must not exceed 100 characters.")
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, "Description must not exceed 1000 characters.")
      .nullable()
      .optional(),

    color: projectColorSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });
