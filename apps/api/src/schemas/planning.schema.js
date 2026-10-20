import { z } from "zod";

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .optional();

export const globalTaskListQuerySchema = z
  .object({
    from: optionalDate,
    to: optionalDate,
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    excludeStatus: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    search: z
      .string()
      .trim()
      .min(1, "Search must not be empty.")
      .max(100, "Search must not exceed 100 characters.")
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine(
    ({ from, to }) => !from || !to || from.getTime() < to.getTime(),
    {
      message: "The start date must be earlier than the end date.",
      path: ["from"],
    },
  );
