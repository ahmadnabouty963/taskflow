import { Router } from "express";
import { completeUpload, deleteAttachment } from "../controllers/attachment.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateParams } from "../middleware/validateParams.js";
import { attachmentIdParamsSchema } from "../schemas/attachment.schema.js";

const attachmentRouter = Router();

attachmentRouter.use(authenticate);
attachmentRouter.post(
  "/:attachmentId/complete",
  validateParams(attachmentIdParamsSchema),
  completeUpload,
);
attachmentRouter.delete(
  "/:attachmentId",
  validateParams(attachmentIdParamsSchema),
  deleteAttachment,
);

export default attachmentRouter;
