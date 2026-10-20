import { z } from "zod";

export const createSubtaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Subtask title is required.")
    .max(200, "Subtask title must not exceed 200 characters."),
});

export const updateSubtaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Subtask title must not be empty.")
      .max(200, "Subtask title must not exceed 200 characters.")
      .optional(),
    completed: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const subtaskParamsSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  subtaskId: z.string().uuid(),
});

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment must not be empty.")
    .max(2000, "Comment must not exceed 2000 characters."),
});

export const commentParamsSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  commentId: z.string().uuid(),
});
