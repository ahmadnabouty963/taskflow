import { z } from "zod";

// Embeds would load arbitrary third-party pages, so they stay blocked.
// Images reference files stored through the whiteboard upload endpoint.
const blockedElementTypes = new Set(["embeddable", "iframe"]);

const whiteboardElement = z
  .object({
    id: z.string().min(1).max(100),
    type: z.string().min(1).max(40),
    link: z.string().max(2000).nullable().optional(),
    fileId: z.string().max(100).nullable().optional(),
  })
  .passthrough()
  .refine((element) => !blockedElementTypes.has(element.type), {
    message: "Embedded content is not supported on whiteboards.",
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
