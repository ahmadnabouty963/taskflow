import express, { Router } from "express";
import {
  getWhiteboard,
  saveWhiteboard,
} from "../controllers/whiteboard.controller.js";
import { requestWhiteboardUpload } from "../controllers/attachment.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import { projectIdParamsSchema } from "../schemas/project.schema.js";
import { saveWhiteboardSchema } from "../schemas/whiteboard.schema.js";
import { requestWhiteboardUploadSchema } from "../schemas/attachment.schema.js";

// Drawings are far larger than other requests, so this route parses its own
// body with a higher limit before the app-wide 10 kB parser runs.
export const whiteboardBodyParser = express.json({ limit: "2mb" });

const whiteboardRouter = Router({ mergeParams: true });

whiteboardRouter.use(authenticate);
whiteboardRouter.get("/", validateParams(projectIdParamsSchema), getWhiteboard);
whiteboardRouter.put(
  "/",
  validateParams(projectIdParamsSchema),
  validateBody(saveWhiteboardSchema),
  saveWhiteboard,
);
whiteboardRouter.post(
  "/files",
  validateParams(projectIdParamsSchema),
  validateBody(requestWhiteboardUploadSchema),
  requestWhiteboardUpload,
);

export default whiteboardRouter;
