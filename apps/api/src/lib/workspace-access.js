import prisma from "./prisma.js";

export const workspaceWriteRoles = ["OWNER", "ADMIN", "MEMBER"];
export const workspaceManageRoles = ["OWNER", "ADMIN"];

export function workspaceMembershipWhere(userId, roles) {
  return {
    members: {
      some: {
        userId,
        ...(roles ? { role: { in: roles } } : {}),
      },
    },
  };
}

export async function getWorkspaceMembership(workspaceId, userId) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
}

export async function findAccessibleProject(projectId, userId, roles) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: workspaceMembershipWhere(userId, roles),
    },
  });
}

export function sendWorkspaceForbidden(response) {
  return response.status(403).json({
    success: false,
    error: {
      code: "WORKSPACE_PERMISSION_DENIED",
      message: "Your workspace role does not allow this action.",
    },
  });
}
