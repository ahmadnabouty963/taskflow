import { z } from "zod";

// Images and embeds need file storage and URL allowlists, which the
// whiteboard does not support yet.
const blockedElementTypes = new Set(["image", "embeddable", "iframe"]);

const whiteboardElement = z
  .object({
    id: z.string().min(1).max(100),
    type: z.string().min(1).max(40),
    link: z.string().max(2000).nullable().optional(),
  })
  .passthrough()
  .refine((element) => !blockedElementTypes.has(element.type), {
    message: "Images and embedded content are not supported on whiteboards yet.",
  })
  .refine((element) => !element.link || /^https?:\/\//i.test(element.link), {
    message: "Whiteboard links must start with http:// or https://.",
  });

export const saveWhiteboardSchema = z.object({
  elements: z
    .array(whiteboardElement)
    .max(5000, "A whiteboard can contain at most 5000 elements."),
  baseVersion: z.number().int().min(0),
});
