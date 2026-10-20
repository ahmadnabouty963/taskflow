import prisma from "../lib/prisma.js";
import {
  findAccessibleProject,
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceMembershipWhere,
  workspaceWriteRoles,
} from "../lib/workspace-access.js";

export async function createProject(request, response, next) {
  try {
    const { title, description, color, workspaceId } = request.body;

    const membership = workspaceId
      ? await getWorkspaceMembership(workspaceId, request.user.id)
      : await prisma.workspaceMember.findFirst({
          where: { userId: request.user.id, workspace: { type: "PERSONAL" } },
          include: { workspace: true },
        });

    if (!membership) {
      return response.status(404).json({
        success: false,
        error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found." },
      });
    }
    if (!workspaceWriteRoles.includes(membership.role)) {
      return sendWorkspaceForbidden(response);
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        color,
        ownerId: request.user.id,
        workspaceId: membership.workspaceId,
      },
    });

    return response.status(201).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjects(request, response, next) {
  try {
    const projects = await prisma.project.findMany({
      where: { workspace: workspaceMembershipWhere(request.user.id) },
      include: {
        workspace: { select: { id: true, name: true, type: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return response.status(200).json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectById(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const project = await findAccessibleProject(projectId, request.user.id);

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
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const existingProject = await findAccessibleProject(
      projectId,
      request.user.id,
      workspaceWriteRoles,
    );

    if (!existingProject) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    const { archived, ...projectFields } = request.body;
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...projectFields,
        ...(archived !== undefined && {
          archivedAt: archived ? new Date() : null,
        }),
      },
    });

    return response.status(200).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(request, response, next) {
  try {
    const { projectId } = request.validatedParams;

    const project = await findAccessibleProject(
      projectId,
      request.user.id,
      ["OWNER", "ADMIN"],
    );

    if (!project) {
      return response.status(404).json({
        success: false,
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found.",
        },
      });
    }

    await prisma.project.delete({ where: { id: projectId } });
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
