import { Router } from "express";
import { register } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validateBody.js";
import { registerSchema } from "../schemas/auth.schema.js";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);

export default authRouter;
