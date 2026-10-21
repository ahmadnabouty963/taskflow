import prisma from "../lib/prisma.js";
import {
  findAccessibleProject,
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceWriteRoles,
} from "../lib/workspace-access.js";

export async function getTaskOptions(request, response, next) {
  try {
    const project = await findAccessibleProject(
      request.validatedParams.projectId,
      request.user.id,
    );

    if (!project) {
      return response.status(404).json({
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
      });
    }

    const [memberships, labels, currentMembership] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId: project.workspaceId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.label.findMany({
        where: { workspaceId: project.workspaceId },
        orderBy: { name: "asc" },
      }),
      getWorkspaceMembership(project.workspaceId, request.user.id),
    ]);

    const members = memberships.map(({ role, user }) => ({ ...user, role }));

    return response.status(200).json({
      success: true,
      data: {
        workspaceId: project.workspaceId,
        members,
        labels,
        canCreateLabels: workspaceWriteRoles.includes(currentMembership.role),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createLabel(request, response, next) {
  try {
    const { workspaceId } = request.validatedParams;
    const membership = await getWorkspaceMembership(workspaceId, request.user.id);

    if (!membership) {
      return response.status(404).json({
        success: false,
        error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found." },
      });
    }
    if (!workspaceWriteRoles.includes(membership.role)) {
      return sendWorkspaceForbidden(response);
    }

    const label = await prisma.label.create({
      data: { ...request.body, workspaceId },
    });

    return response.status(201).json({ success: true, data: { label } });
  } catch (error) {
    if (error?.code === "P2002") {
      return response.status(409).json({
        success: false,
        error: {
          code: "LABEL_ALREADY_EXISTS",
          message: "A label with this name already exists in the workspace.",
        },
      });
    }
    next(error);
  }
}

export async function deleteLabel(request, response, next) {
  try {
    const { workspaceId, labelId } = request.validatedParams;
    const membership = await getWorkspaceMembership(workspaceId, request.user.id);

    if (!membership) {
      return response.status(404).json({
        success: false,
        error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found." },
      });
    }
    if (!workspaceWriteRoles.includes(membership.role)) {
      return sendWorkspaceForbidden(response);
    }

    const result = await prisma.label.deleteMany({
      where: { id: labelId, workspaceId },
    });
    if (result.count === 0) {
      return response.status(404).json({
        success: false,
        error: { code: "LABEL_NOT_FOUND", message: "Label not found." },
      });
    }
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
