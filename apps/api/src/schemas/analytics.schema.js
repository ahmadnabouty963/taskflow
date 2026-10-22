import { z } from "zod";

export const pageViewSchema = z.object({
  path: z.string().trim().startsWith("/").max(300),
  referrer: z.string().trim().max(1000).optional().nullable(),
});

export const trafficQuerySchema = z.object({
  days: z.coerce.number().int().refine((value) => [7, 30, 90, 365].includes(value), {
    message: "Days must be 7, 30, 90 or 365.",
  }).default(30),
});
