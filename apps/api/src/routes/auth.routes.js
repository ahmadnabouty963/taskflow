import { Router } from "express";
import {
  changePassword,
  deleteAccount,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  logoutOtherSessions,
  register,
  resendVerification,
  resetPassword,
  updateProfile,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { validateBody } from "../middleware/validateBody.js";
import {
  changePasswordSchema,
  deleteAccountSchema,
  emailRequestSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
  updateProfileSchema,
} from "../schemas/auth.schema.js";

const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), register);
authRouter.post("/login", authLimiter, validateBody(loginSchema), login);
authRouter.post(
  "/verify-email",
  authLimiter,
  validateBody(tokenSchema),
  verifyEmail,
);
authRouter.post(
  "/resend-verification",
  authLimiter,
  validateBody(emailRequestSchema),
  resendVerification,
);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(emailRequestSchema),
  forgotPassword,
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  resetPassword,
);

authRouter.get("/me", authenticate, getCurrentUser);
authRouter.patch("/me", authenticate, validateBody(updateProfileSchema), updateProfile);
authRouter.patch(
  "/password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);
authRouter.post("/logout-others", authenticate, logoutOtherSessions);
authRouter.delete(
  "/me",
  authenticate,
  validateBody(deleteAccountSchema),
  deleteAccount,
);
authRouter.post("/logout", authenticate, logout);

export default authRouter;
