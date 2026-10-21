import { removeAttachmentFiles, storageKeysWhere } from "../lib/attachments.js";
import prisma from "../lib/prisma.js";
import { findAccessibleProject, workspaceWriteRoles } from "../lib/workspace-access.js";

const taskRelations = {
  assignee: { select: { id: true, name: true, email: true } },
  labels: { select: { id: true, name: true, color: true } },
};

function getNextDueDate(currentDueDate, recurrence) {
  const next = new Date(currentDueDate);
  if (recurrence === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
  if (recurrence === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  if (recurrence === "MONTHLY") {
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(originalDay, lastDay));
  }
  return next;
}

function sendMissingRecurringDate(response) {
  return response.status(422).json({
    success: false,
    error: {
      code: "RECURRING_TASK_REQUIRES_DUE_DATE",
      message: "A due date is required for a recurring task.",
    },
  });
}

async function validateRelations(project, assigneeId, labelIds) {
  if (assigneeId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: assigneeId } },
    });
    if (!membership) return "ASSIGNEE_NOT_IN_WORKSPACE";
  }

  if (labelIds?.length) {
    const count = await prisma.label.count({
      where: { id: { in: labelIds }, workspaceId: project.workspaceId },
    });
    if (count !== labelIds.length) return "LABEL_NOT_IN_WORKSPACE";
  }
  return null;
}

function sendRelationError(response, code) {
  const message = code === "ASSIGNEE_NOT_IN_WORKSPACE"
    ? "The responsible person must be a member of this workspace."
    : "Every label must belong to this workspace.";
  return response.status(422).json({ success: false, error: { code, message } });
}

export async function createTask(request, response, next) {
  try {
    const { projectId } = request.validatedParams;
    const project = await findAccessibleProject(projectId, request.user.id, workspaceWriteRoles);
    if (!project) return response.status(404).json({ success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });

    const { assigneeId, labelIds, ...fields } = request.body;
    if (fields.recurrence && fields.recurrence !== "NONE" && !fields.dueDate) {
      return sendMissingRecurringDate(response);
    }
    const relationError = await validateRelations(project, assigneeId, labelIds);
    if (relationError) return sendRelationError(response, relationError);

    const task = await prisma.task.create({
      data: {
        ...fields,
        projectId,
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(labelIds ? { labels: { connect: labelIds.map((id) => ({ id })) } } : {}),
      },
      include: taskRelations,
    });
    return response.status(201).json({ success: true, data: { task } });
  } catch (error) { next(error); }
}

export async function getTasks(request, response, next) {
  try {
    const { projectId } = request.validatedParams;
    const { status, priority, search, page, limit, assigneeId, labelId } = request.validatedQuery;
    const project = await findAccessibleProject(projectId, request.user.id);
    if (!project) return response.status(404).json({ success: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });

    const where = {
      projectId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assigneeId && { assigneeId }),
      ...(labelId && { labels: { some: { id: labelId } } }),
      ...(search && { OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ] }),
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        include: { ...taskRelations, _count: { select: { subtasks: true, comments: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);
    return response.status(200).json({ success: true, data: { tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
}

export async function getTaskById(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId, project: { workspace: { members: { some: { userId: request.user.id } } } } },
      include: {
        ...taskRelations,
        subtasks: { orderBy: { createdAt: "asc" } },
        comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!task) return response.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
    return response.status(200).json({ success: true, data: { task } });
  } catch (error) { next(error); }
}

export async function updateTask(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, projectId, project: { workspace: { members: { some: { userId: request.user.id, role: { in: workspaceWriteRoles } } } } } },
      include: { project: { select: { workspaceId: true } } },
    });
    if (!existingTask) return response.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found." } });

    const { assigneeId, labelIds, ...fields } = request.body;
    const effectiveRecurrence = fields.recurrence ?? existingTask.recurrence;
    const effectiveDueDate = fields.dueDate !== undefined ? fields.dueDate : existingTask.dueDate;
    if (effectiveRecurrence !== "NONE" && !effectiveDueDate) {
      return sendMissingRecurringDate(response);
    }
    const relationError = await validateRelations(existingTask.project, assigneeId, labelIds);
    if (relationError) return sendRelationError(response, relationError);

    const shouldCreateNext =
      fields.status === "DONE" &&
      existingTask.status !== "DONE" &&
      effectiveRecurrence !== "NONE";

    const { task, nextOccurrence } = await prisma.$transaction(async (transaction) => {
      const updatedTask = await transaction.task.update({
        where: { id: taskId },
        data: {
          ...fields,
          ...(assigneeId !== undefined ? { assigneeId } : {}),
          ...(labelIds !== undefined ? { labels: { set: labelIds.map((id) => ({ id })) } } : {}),
        },
        include: taskRelations,
      });

      if (!shouldCreateNext) return { task: updatedTask, nextOccurrence: null };

      const alreadyCreated = await transaction.task.findUnique({
        where: { recurringFromId: taskId },
        include: taskRelations,
      });
      if (alreadyCreated) return { task: updatedTask, nextOccurrence: alreadyCreated };

      const nextTask = await transaction.task.create({
        data: {
          title: updatedTask.title,
          description: updatedTask.description,
          status: "TODO",
          priority: updatedTask.priority,
          dueDate: getNextDueDate(updatedTask.dueDate, updatedTask.recurrence),
          recurrence: updatedTask.recurrence,
          estimatedMinutes: updatedTask.estimatedMinutes,
          projectId,
          assigneeId: updatedTask.assigneeId,
          recurringFromId: taskId,
          labels: {
            connect: updatedTask.labels.map(({ id }) => ({ id })),
          },
        },
        include: taskRelations,
      });
      return { task: updatedTask, nextOccurrence: nextTask };
    });
    return response.status(200).json({ success: true, data: { task, nextOccurrence } });
  } catch (error) { next(error); }
}

export async function deleteTask(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, projectId, project: { workspace: { members: { some: { userId: request.user.id, role: { in: workspaceWriteRoles } } } } } },
    });
    if (!existingTask) return response.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
    const storageKeys = await storageKeysWhere({ taskId });
    await prisma.task.delete({ where: { id: taskId } });
    await removeAttachmentFiles(storageKeys);
    return response.status(204).send();
  } catch (error) { next(error); }
}
