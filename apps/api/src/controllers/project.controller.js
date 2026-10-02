import prisma from "../lib/prisma.js";

export async function createProject(request, response, next) {
  try {
    const { title, description } = request.body;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        ownerId: request.user.id,
      },
    });

    return response.status(201).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjects(request, response, next) {
  try {
    const projects = await prisma.project.findMany({
      where: {
        ownerId: request.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return response.status(200).json({
      success: true,
      data: {
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
}
