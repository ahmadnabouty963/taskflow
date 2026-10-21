import { z } from "zod";

const fileFields = {
  fileName: z.string().trim().min(1, "File name is required.").max(255),
  contentType: z.string().trim().toLowerCase().min(1).max(150),
  size: z.number().int().positive("The file is empty."),
};

export const requestTaskUploadSchema = z.object(fileFields);

export const requestWhiteboardUploadSchema = z.object({
  ...fileFields,
  fileId: z.string().min(1).max(100),
});

export const attachmentIdParamsSchema = z.object({
  attachmentId: z.string().uuid("Attachment ID must be a valid UUID."),
});
