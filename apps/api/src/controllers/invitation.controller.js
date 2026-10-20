import prisma from "../lib/prisma.js";
import { sendWorkspaceInvitationEmail } from "../lib/email.js";
import {
  createInvitationToken,
  getInvitationExpiry,
  hashInvitationToken,
} from "../lib/invitation-token.js";
import {
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceManageRoles,
} from "../lib/workspace-access.js";

const publicInvitationSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  workspace: { select: { id: true, name: true } },
  invitedBy: { select: { name: true } },
};

const managerInvitationSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
};

async function requireTeamManager(workspaceId, userId, response) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
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

  if (membership.workspace.type !== "TEAM") {
    response.status(422).json({
      success: false,
      error: {
        code: "PERSONAL_WORKSPACE",
        message: "Personal workspaces cannot invite team members.",
      },
    });
    return null;
  }

  return membership;
}

async function findValidInvitation(token) {
  const tokenHash = hashInvitationToken(token);
  return prisma.workspaceInvitation.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    select: publicInvitationSelect,
  });
}

function sendInvitationUnavailable(response) {
  return response.status(410).json({
    success: false,
    error: {
      code: "INVITATION_UNAVAILABLE",
      message: "This invitation is invalid, expired or no longer available.",
    },
  });
}

async function deliverInvitation(invitation, token, inviterName, workspaceName) {
  return sendWorkspaceInvitationEmail({
    invitationId: invitation.id,
    token,
    email: invitation.email,
    inviterName,
    workspaceName,
    role: invitation.role,
  });
}

export async function listInvitations(request, response, next) {
  try {
    const manager = await requireTeamManager(
      request.validatedParams.workspaceId,
      request.user.id,
      response,
    );
    if (!manager) return;

    await prisma.workspaceInvitation.deleteMany({
      where: { workspaceId: manager.workspaceId, expiresAt: { lte: new Date() } },
    });

    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId: manager.workspaceId },
      select: managerInvitationSelect,
      orderBy: { createdAt: "desc" },
    });

    return response.status(200).json({
      success: true,
      data: { invitations },
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvitation(request, response, next) {
  try {
    const manager = await requireTeamManager(
      request.validatedParams.workspaceId,
      request.user.id,
      response,
    );
    if (!manager) return;

    const { email, role } = request.body;
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: manager.workspaceId, user: { email } },
    });
    if (existingMember) {
      return response.status(409).json({
        success: false,
        error: {
          code: "MEMBER_EXISTS",
          message: "This person is already a workspace member.",
        },
      });
    }

    const token = createInvitationToken();
    const invitation = await prisma.workspaceInvitation.upsert({
      where: { workspaceId_email: { workspaceId: manager.workspaceId, email } },
      create: {
        workspaceId: manager.workspaceId,
        email,
        role,
        tokenHash: hashInvitationToken(token),
        invitedById: request.user.id,
        expiresAt: getInvitationExpiry(),
      },
      update: {
        role,
        tokenHash: hashInvitationToken(token),
        invitedById: request.user.id,
        expiresAt: getInvitationExpiry(),
      },
      select: managerInvitationSelect,
    });

    try {
      await deliverInvitation(
        invitation,
        token,
        request.user.name,
        manager.workspace.name,
      );
    } catch (emailError) {
      await prisma.workspaceInvitation.deleteMany({ where: { id: invitation.id } });
      return response.status(502).json({
        success: false,
        error: {
          code: "INVITATION_EMAIL_FAILED",
          message: "The invitation email could not be sent. Please try again.",
        },
      });
    }

    return response.status(201).json({
      success: true,
      data: { invitation },
    });
  } catch (error) {
    next(error);
  }
}

export async function resendInvitation(request, response, next) {
  try {
    const manager = await requireTeamManager(
      request.validatedParams.workspaceId,
      request.user.id,
      response,
    );
    if (!manager) return;

    const current = await prisma.workspaceInvitation.findFirst({
      where: {
        id: request.validatedParams.invitationId,
        workspaceId: manager.workspaceId,
      },
    });
    if (!current) return sendInvitationUnavailable(response);

    const token = createInvitationToken();
    const invitation = await prisma.workspaceInvitation.update({
      where: { id: current.id },
      data: {
        tokenHash: hashInvitationToken(token),
        invitedById: request.user.id,
        expiresAt: getInvitationExpiry(),
      },
      select: managerInvitationSelect,
    });

    try {
      await deliverInvitation(
        invitation,
        token,
        request.user.name,
        manager.workspace.name,
      );
    } catch (emailError) {
      await prisma.workspaceInvitation.update({
        where: { id: current.id },
        data: {
          tokenHash: current.tokenHash,
          invitedById: current.invitedById,
          expiresAt: current.expiresAt,
        },
      });
      return response.status(502).json({
        success: false,
        error: {
          code: "INVITATION_EMAIL_FAILED",
          message: "The invitation email could not be sent. Please try again.",
        },
      });
    }

    return response.status(200).json({ success: true, data: { invitation } });
  } catch (error) {
    next(error);
  }
}

export async function revokeInvitation(request, response, next) {
  try {
    const manager = await requireTeamManager(
      request.validatedParams.workspaceId,
      request.user.id,
      response,
    );
    if (!manager) return;

    const result = await prisma.workspaceInvitation.deleteMany({
      where: {
        id: request.validatedParams.invitationId,
        workspaceId: manager.workspaceId,
      },
    });
    if (result.count === 0) return sendInvitationUnavailable(response);

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getInvitation(request, response, next) {
  try {
    const invitation = await findValidInvitation(request.validatedParams.token);
    if (!invitation) return sendInvitationUnavailable(response);

    return response.status(200).json({ success: true, data: { invitation } });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitation(request, response, next) {
  try {
    const invitation = await findValidInvitation(request.validatedParams.token);
    if (!invitation) return sendInvitationUnavailable(response);

    if (request.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return response.status(403).json({
        success: false,
        error: {
          code: "INVITATION_EMAIL_MISMATCH",
          message: `Log in with ${invitation.email} to accept this invitation.`,
        },
      });
    }

    const member = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspace.id,
            userId: request.user.id,
          },
        },
      });

      const membership = existing ?? await transaction.workspaceMember.create({
        data: {
          workspaceId: invitation.workspace.id,
          userId: request.user.id,
          role: invitation.role,
        },
      });

      await transaction.workspaceInvitation.delete({
        where: { id: invitation.id },
      });
      return membership;
    });

    return response.status(200).json({
      success: true,
      data: { member, workspace: invitation.workspace },
    });
  } catch (error) {
    next(error);
  }
}

export async function declineInvitation(request, response, next) {
  try {
    const invitation = await findValidInvitation(request.validatedParams.token);
    if (!invitation) return sendInvitationUnavailable(response);

    await prisma.workspaceInvitation.delete({ where: { id: invitation.id } });
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
