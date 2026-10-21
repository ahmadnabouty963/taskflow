import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

const newPasswordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password must not contain more than 72 characters.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const emailRequestSchema = z.object({ email: emailSchema });

export const tokenSchema = z.object({
  token: z.string().trim().min(32, "The private token is invalid.").max(256),
});

export const resetPasswordSchema = tokenSchema.extend({
  newPassword: newPasswordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: newPasswordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required."),
});
