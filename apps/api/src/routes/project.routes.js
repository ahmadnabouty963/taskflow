import { Router } from "express";
import {
  createProject,
  getProjects,
} from "../controllers/project.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { createProjectSchema } from "../schemas/project.schema.js";

const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter.post("/", validateBody(createProjectSchema), createProject);

projectRouter.get("/", getProjects);

export default projectRouter;
