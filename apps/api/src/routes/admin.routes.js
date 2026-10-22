import { Router } from "express";
import { deleteUser, getOverview, listUsers, updateUser } from "../controllers/admin.controller.js";
import { authenticate, requirePlatformAdmin } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import {
  adminUserListQuerySchema,
  adminUserParamsSchema,
  deleteAdminUserSchema,
  updateAdminUserSchema,
} from "../schemas/admin.schema.js";

const adminRouter = Router();

adminRouter.use(authenticate, requirePlatformAdmin);
adminRouter.get("/overview", getOverview);
adminRouter.get("/users", validateQuery(adminUserListQuerySchema), listUsers);
adminRouter.patch(
  "/users/:userId",
  validateParams(adminUserParamsSchema),
  validateBody(updateAdminUserSchema),
  updateUser,
);
adminRouter.delete(
  "/users/:userId",
  validateParams(adminUserParamsSchema),
  validateBody(deleteAdminUserSchema),
  deleteUser,
);

export default adminRouter;
