import prisma from "../lib/prisma.js";

async function findOwnedProject(projectId, ownerId) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId,
    },
    select: {
      id: true,
    },
  });
}

export async function createTask(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const project = await findOwnedProject(projectId, request.user.id);

    if (!project) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    const task = await prisma.task.create({
      data: {
        ...request.body,
        projectId,
      },
    });

    return response.status(201).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTasks(request, response, next) {
  try {
    const { projectId } = request.validatedParams;
    const { status, priority, search, page, limit } = request.validatedQuery;

    const project = await findOwnedProject(projectId, request.user.id);

    if (!project) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    const where = {
      projectId,
      ...(status && {
        status,
      }),
      ...(priority && {
        priority,
      }),
      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({
        where,
      }),
    ]);

    return response.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function getTaskById(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          ownerId: request.user.id,
        },
      },
    });

    if (!task) {
      return response.status(404).json({
        success: false,
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found.",
        },
      });
    }

    return response.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function updateTask(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          ownerId: request.user.id,
        },
      },
    });

    if (!existingTask) {
      return response.status(404).json({
        success: false,
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found.",
        },
      });
    }

    const task = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: request.body,
    });

    return response.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function deleteTask(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          ownerId: request.user.id,
        },
      },
    });

    if (!existingTask) {
      return response.status(404).json({
        success: false,
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found.",
        },
      });
    }

    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
