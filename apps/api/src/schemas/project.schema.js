import { z } from "zod";

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
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });
