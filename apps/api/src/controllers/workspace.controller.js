import prisma from "../lib/prisma.js";
import {
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceManageRoles,
} from "../lib/workspace-access.js";

const workspaceInclude = {
  _count: { select: { members: true, projects: true } },
};

async function requireManager(request, response) {
  const membership = await getWorkspaceMembership(
    request.validatedParams.workspaceId,
    request.user.id,
  );

  if (!membership) {
    response.status(404).json({
      success: false,
      error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found." },
    });
    return null;
  }

  if (!workspaceManageRoles.includes(membership.role)) {
    sendWorkspaceForbidden(response);
    return null;
  }

  return membership;
}

export async function getWorkspaces(request, response, next) {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: request.user.id },
      include: { workspace: { include: workspaceInclude } },
      orderBy: { workspace: { createdAt: "asc" } },
    });

    const workspaces = memberships.map(({ role, workspace }) => ({
      ...workspace,
      role,
    }));

    return response.status(200).json({ success: true, data: { workspaces } });
  } catch (error) {
    next(error);
  }
}

export async function createWorkspace(request, response, next) {
  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: request.body.name,
        type: "TEAM",
        ownerId: request.user.id,
        members: {
          create: { userId: request.user.id, role: "OWNER" },
        },
      },
      include: workspaceInclude,
    });

    return response.status(201).json({
      success: true,
      data: { workspace: { ...workspace, role: "OWNER" } },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(request, response, next) {
  try {
    const membership = await requireManager(request, response);
    if (!membership) return;

    const workspace = await prisma.workspace.update({
      where: { id: membership.workspaceId },
      data: { name: request.body.name },
      include: workspaceInclude,
    });

    return response.status(200).json({
      success: true,
      data: { workspace: { ...workspace, role: membership.role } },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMembers(request, response, next) {
  try {
    const membership = await getWorkspaceMembership(
      request.validatedParams.workspaceId,
      request.user.id,
    );
    if (!membership) {
      return response.status(404).json({
        success: false,
        error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found." },
      });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: membership.workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return response.status(200).json({
      success: true,
      data: { members, currentRole: membership.role },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(request, response, next) {
  try {
    const manager = await requireManager(request, response);
    if (!manager) return;
    const { userId } = request.validatedParams;

    const target = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: manager.workspaceId, userId },
      },
    });
    if (!target) {
      return response.status(404).json({
        success: false,
        error: { code: "MEMBER_NOT_FOUND", message: "Member not found." },
      });
    }
    if (target.role === "OWNER") return sendWorkspaceForbidden(response);

    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId: manager.workspaceId, userId },
      },
      data: { role: request.body.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return response.status(200).json({ success: true, data: { member } });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(request, response, next) {
  try {
    const manager = await requireManager(request, response);
    if (!manager) return;
    const { userId } = request.validatedParams;

    const target = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: manager.workspaceId, userId },
      },
    });
    if (!target) {
      return response.status(404).json({
        success: false,
        error: { code: "MEMBER_NOT_FOUND", message: "Member not found." },
      });
    }
    if (target.role === "OWNER") return sendWorkspaceForbidden(response);

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId: manager.workspaceId, userId },
      },
    });
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
