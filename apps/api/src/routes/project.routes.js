import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import {
  createProjectSchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "../schemas/project.schema.js";

const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter.post("/", validateBody(createProjectSchema), createProject);

projectRouter.get("/", getProjects);

projectRouter.get(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  getProjectById,
);
projectRouter.patch(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  validateBody(updateProjectSchema),
  updateProject,
);
projectRouter.delete(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  deleteProject,
);

export default projectRouter;
