import { Router } from "express";
import {
  addMember,
  createWorkspace,
  getMembers,
  getWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from "../controllers/workspace.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import {
  addMemberSchema,
  createWorkspaceSchema,
  memberParamsSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceIdParamsSchema,
} from "../schemas/workspace.schema.js";

const router = Router();
router.use(authenticate);

router.get("/", getWorkspaces);
router.post("/", validateBody(createWorkspaceSchema), createWorkspace);
router.patch(
  "/:workspaceId",
  validateParams(workspaceIdParamsSchema),
  validateBody(updateWorkspaceSchema),
  updateWorkspace,
);
router.get(
  "/:workspaceId/members",
  validateParams(workspaceIdParamsSchema),
  getMembers,
);
router.post(
  "/:workspaceId/members",
  validateParams(workspaceIdParamsSchema),
  validateBody(addMemberSchema),
  addMember,
);
router.patch(
  "/:workspaceId/members/:userId",
  validateParams(memberParamsSchema),
  validateBody(updateMemberRoleSchema),
  updateMemberRole,
);
router.delete(
  "/:workspaceId/members/:userId",
  validateParams(memberParamsSchema),
  removeMember,
);

export default router;
