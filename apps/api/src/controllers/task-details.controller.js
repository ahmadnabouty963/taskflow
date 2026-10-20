import prisma from "../lib/prisma.js";

async function findOwnedTask(taskId, projectId, ownerId) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
      project: { ownerId },
    },
    select: { id: true },
  });
}

async function requireOwnedTask(request, response) {
  const { projectId, taskId } = request.validatedParams;
  const task = await findOwnedTask(taskId, projectId, request.user.id);

  if (!task) {
    response.status(404).json({
      success: false,
      error: { code: "TASK_NOT_FOUND", message: "Task not found." },
    });
    return null;
  }

  return task;
}

export async function createSubtask(request, response, next) {
  try {
    const task = await requireOwnedTask(request, response);
    if (!task) return;

    const subtask = await prisma.subtask.create({
      data: { title: request.body.title, taskId: task.id },
    });

    return response.status(201).json({ success: true, data: { subtask } });
  } catch (error) {
    next(error);
  }
}

export async function updateSubtask(request, response, next) {
  try {
    const task = await requireOwnedTask(request, response);
    if (!task) return;

    const { subtaskId } = request.validatedParams;
    const existing = await prisma.subtask.findFirst({
      where: { id: subtaskId, taskId: task.id },
    });

    if (!existing) {
      return response.status(404).json({
        success: false,
        error: { code: "SUBTASK_NOT_FOUND", message: "Subtask not found." },
      });
    }

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: request.body,
    });

    return response.status(200).json({ success: true, data: { subtask } });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubtask(request, response, next) {
  try {
    const task = await requireOwnedTask(request, response);
    if (!task) return;

    const result = await prisma.subtask.deleteMany({
      where: { id: request.validatedParams.subtaskId, taskId: task.id },
    });

    if (result.count === 0) {
      return response.status(404).json({
        success: false,
        error: { code: "SUBTASK_NOT_FOUND", message: "Subtask not found." },
      });
    }

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createComment(request, response, next) {
  try {
    const task = await requireOwnedTask(request, response);
    if (!task) return;

    const comment = await prisma.comment.create({
      data: {
        body: request.body.body,
        taskId: task.id,
        authorId: request.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return response.status(201).json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(request, response, next) {
  try {
    const task = await requireOwnedTask(request, response);
    if (!task) return;

    const result = await prisma.comment.deleteMany({
      where: {
        id: request.validatedParams.commentId,
        taskId: task.id,
        authorId: request.user.id,
      },
    });

    if (result.count === 0) {
      return response.status(404).json({
        success: false,
        error: { code: "COMMENT_NOT_FOUND", message: "Comment not found." },
      });
    }

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
