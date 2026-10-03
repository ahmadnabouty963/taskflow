import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(150, "Task title must not exceed 150 characters."),

  description: z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters.")
    .optional(),

  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),

  dueDate: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .nullable()
    .optional(),
});
export const taskIdParamsSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID."),

  taskId: z.string().uuid("Task ID must be a valid UUID."),
});
export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title must not be empty.")
      .max(150, "Task title must not exceed 150 characters.")
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, "Description must not exceed 2000 characters.")
      .nullable()
      .optional(),

    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),

    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),

    dueDate: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value))
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });
