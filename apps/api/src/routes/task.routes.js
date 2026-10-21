import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { getTaskOptions } from "../controllers/task-metadata.controller.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import { projectIdParamsSchema } from "../schemas/project.schema.js";
import {
  createTaskSchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "../schemas/task.schema.js";
import { validateQuery } from "../middleware/validateQuery.js";
import {
  createComment,
  createSubtask,
  deleteComment,
  deleteSubtask,
  updateSubtask,
} from "../controllers/task-details.controller.js";
import {
  commentParamsSchema,
  createCommentSchema,
  createSubtaskSchema,
  subtaskParamsSchema,
  updateSubtaskSchema,
} from "../schemas/task-details.schema.js";

const taskRouter = Router({
  mergeParams: true,
});

taskRouter.use(authenticate);
taskRouter.use(validateParams(projectIdParamsSchema));

taskRouter.post("/", validateBody(createTaskSchema), createTask);

taskRouter.get("/", validateQuery(taskListQuerySchema), getTasks);
taskRouter.get("/options", getTaskOptions);
taskRouter.post(
  "/:taskId/subtasks",
  validateParams(taskIdParamsSchema),
  validateBody(createSubtaskSchema),
  createSubtask,
);
taskRouter.patch(
  "/:taskId/subtasks/:subtaskId",
  validateParams(subtaskParamsSchema),
  validateBody(updateSubtaskSchema),
  updateSubtask,
);
taskRouter.delete(
  "/:taskId/subtasks/:subtaskId",
  validateParams(subtaskParamsSchema),
  deleteSubtask,
);
taskRouter.post(
  "/:taskId/comments",
  validateParams(taskIdParamsSchema),
  validateBody(createCommentSchema),
  createComment,
);
taskRouter.delete(
  "/:taskId/comments/:commentId",
  validateParams(commentParamsSchema),
  deleteComment,
);

taskRouter.get("/:taskId", validateParams(taskIdParamsSchema), getTaskById);
taskRouter.patch(
  "/:taskId",
  validateParams(taskIdParamsSchema),
  validateBody(updateTaskSchema),
  updateTask,
);
taskRouter.delete("/:taskId", validateParams(taskIdParamsSchema), deleteTask);
export default taskRouter;
