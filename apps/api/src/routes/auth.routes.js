import { Router } from "express";
import {
  changePassword,
  deleteAccount,
  getCurrentUser,
  login,
  logout,
  logoutOtherSessions,
  register,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { validateBody } from "../middleware/validateBody.js";
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../schemas/auth.schema.js";
import { authenticate } from "../middleware/authenticate.js";
const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  register,
);

authRouter.post("/login", authLimiter, validateBody(loginSchema), login);
authRouter.get("/me", authenticate, getCurrentUser);

authRouter.patch(
  "/me",
  authenticate,
  validateBody(updateProfileSchema),
  updateProfile,
);

authRouter.patch(
  "/password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);

authRouter.post(
  "/logout-others",
  authenticate,
  logoutOtherSessions,
);

authRouter.delete(
  "/me",
  authenticate,
  validateBody(deleteAccountSchema),
  deleteAccount,
);

authRouter.post("/logout", authenticate, logout);

export default authRouter;
