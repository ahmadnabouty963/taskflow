import { z } from "zod";

const assigneeId = z.string().uuid("Assignee ID must be a valid UUID.").nullable().optional();
const labelIds = z.array(z.string().uuid("Label ID must be a valid UUID.")).max(20).refine(
  (values) => new Set(values).size === values.length,
  "Labels must be unique.",
).optional();
const recurrence = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]);
const minutes = z.number().int().min(1).max(525600).nullable().optional();

function requireDueDateForRecurrence(data, context) {
  if (data.recurrence && data.recurrence !== "NONE" && !data.dueDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "A due date is required for a recurring task.",
    });
  }
}

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(150),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().datetime({ offset: true }).transform((value) => new Date(value)).nullable().optional(),
  recurrence: recurrence.optional(),
  estimatedMinutes: minutes,
  actualMinutes: minutes,
  assigneeId,
  labelIds,
}).superRefine(requireDueDateForRecurrence);

export const taskIdParamsSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID."),
  taskId: z.string().uuid("Task ID must be a valid UUID."),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().datetime({ offset: true }).transform((value) => new Date(value)).nullable().optional(),
  recurrence: recurrence.optional(),
  estimatedMinutes: minutes,
  actualMinutes: minutes,
  assigneeId,
  labelIds,
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided.",
});

export const taskListQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assigneeId: z.string().uuid("Assignee ID must be a valid UUID.").optional(),
  labelId: z.string().uuid("Label ID must be a valid UUID.").optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
