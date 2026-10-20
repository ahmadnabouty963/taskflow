import { Router } from "express";
import { getGlobalTasks } from "../controllers/planning.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { globalTaskListQuerySchema } from "../schemas/planning.schema.js";

const planningRouter = Router();

planningRouter.use(authenticate);
planningRouter.get(
  "/",
  validateQuery(globalTaskListQuerySchema),
  getGlobalTasks,
);

export default planningRouter;
