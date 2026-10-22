import { z } from "zod";

export const adminUserListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["all", "active", "blocked", "unverified", "admins"]).default("all"),
  sort: z.enum(["newest", "oldest", "lastActive", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const adminUserParamsSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID."),
});

export const updateAdminUserSchema = z.object({
  blocked: z.boolean(),
});

export const deleteAdminUserSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().email("Enter the user's email address to confirm."),
});
