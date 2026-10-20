import { Router } from "express";
import {
  acceptInvitation,
  declineInvitation,
  getInvitation,
} from "../controllers/invitation.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateParams } from "../middleware/validateParams.js";
import { invitationTokenParamsSchema } from "../schemas/invitation.schema.js";

const router = Router();

router.get("/:token", validateParams(invitationTokenParamsSchema), getInvitation);
router.post(
  "/:token/accept",
  validateParams(invitationTokenParamsSchema),
  authenticate,
  acceptInvitation,
);
router.post(
  "/:token/decline",
  validateParams(invitationTokenParamsSchema),
  declineInvitation,
);

export default router;
