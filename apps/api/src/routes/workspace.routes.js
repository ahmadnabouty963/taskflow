import { Router } from "express";
import {
  createWorkspace,
  getMembers,
  getWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from "../controllers/workspace.controller.js";
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
} from "../controllers/invitation.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import {
  createWorkspaceSchema,
  memberParamsSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceIdParamsSchema,
} from "../schemas/workspace.schema.js";
import {
  createInvitationSchema,
  invitationIdParamsSchema,
} from "../schemas/invitation.schema.js";

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
router.get(
  "/:workspaceId/invitations",
  validateParams(workspaceIdParamsSchema),
  listInvitations,
);
router.post(
  "/:workspaceId/invitations",
  validateParams(workspaceIdParamsSchema),
  validateBody(createInvitationSchema),
  createInvitation,
);
router.post(
  "/:workspaceId/invitations/:invitationId/resend",
  validateParams(invitationIdParamsSchema),
  resendInvitation,
);
router.delete(
  "/:workspaceId/invitations/:invitationId",
  validateParams(invitationIdParamsSchema),
  revokeInvitation,
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
