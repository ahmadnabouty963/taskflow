import prisma from "../lib/prisma.js";

export async function getGlobalTasks(request, response, next) {
  try {
    const {
      from,
      to,
      status,
      excludeStatus,
      priority,
      search,
      page,
      limit,
    } = request.validatedQuery;

    const where = {
      project: {
        ownerId: request.user.id,
      },
      ...(from || to
        ? {
            dueDate: {
              ...(from && { gte: from }),
              ...(to && { lt: to }),
            },
          }
        : {}),
      ...(status && { status }),
      ...(excludeStatus && { status: { not: excludeStatus } }),
      ...(priority && { priority }),
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
          {
            project: {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
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
