import { Router } from "express";
import {
  getCurrentUser,
  login,
  register,
  logout,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { validateBody } from "../middleware/validateBody.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
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
authRouter.post("/logout", authenticate, logout);
export default authRouter;
