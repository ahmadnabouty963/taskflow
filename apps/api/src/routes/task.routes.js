import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import { projectIdParamsSchema } from "../schemas/project.schema.js";
import {
  createTaskSchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from "../schemas/task.schema.js";

const taskRouter = Router({
  mergeParams: true,
});

taskRouter.use(authenticate);
taskRouter.use(validateParams(projectIdParamsSchema));

taskRouter.post("/", validateBody(createTaskSchema), createTask);

taskRouter.get("/", getTasks);
taskRouter.get("/:taskId", validateParams(taskIdParamsSchema), getTaskById);
taskRouter.patch(
  "/:taskId",
  validateParams(taskIdParamsSchema),
  validateBody(updateTaskSchema),
  updateTask,
);
taskRouter.delete("/:taskId", validateParams(taskIdParamsSchema), deleteTask);
export default taskRouter;
