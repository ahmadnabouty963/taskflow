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
export async function getProjectById(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: request.user.id,
      },
    });

    if (!project) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    return response.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function updateProject(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: request.user.id,
      },
    });

    if (!existingProject) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    const project = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: request.body,
    });

    return response.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function deleteProject(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const result = await prisma.project.deleteMany({
      where: {
        id: projectId,
        ownerId: request.user.id,
      },
    });

    if (result.count === 0) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
