import { z } from "zod";

const eventFields = {
  title: z
    .string()
    .trim()
    .min(1, "Event title is required.")
    .max(120, "Event title must not exceed 120 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters.")
    .nullable()
    .optional(),
  location: z
    .string()
    .trim()
    .max(200, "Location must not exceed 200 characters.")
    .nullable()
    .optional(),
  startsAt: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  endsAt: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  allDay: z.boolean().default(false),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color.")
    .default("#2F6049"),
};

function endsAfterStart(data) {
  return data.endsAt.getTime() > data.startsAt.getTime();
}

export const createEventSchema = z
  .object(eventFields)
  .refine(endsAfterStart, {
    path: ["endsAt"],
    message: "End time must be after start time.",
  });

export const updateEventSchema = createEventSchema;

export const eventIdParamsSchema = z.object({
  eventId: z.string().uuid("Event ID must be a valid UUID."),
});

export const eventRangeQuerySchema = z
  .object({
    from: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    to: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
  })
  .refine((data) => data.to.getTime() > data.from.getTime(), {
    path: ["to"],
    message: "The end of the range must be after its start.",
  });
