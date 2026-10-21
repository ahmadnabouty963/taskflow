import prisma from "../lib/prisma.js";
import {
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceManageRoles,
  workspaceMembershipWhere,
  workspaceWriteRoles,
} from "../lib/workspace-access.js";

const eventInclude = {
  owner: { select: { id: true, name: true } },
  workspace: { select: { id: true, name: true, type: true } },
};

function sendEventNotFound(response) {
  return response.status(404).json({
    success: false,
    error: { code: "EVENT_NOT_FOUND", message: "Event not found." },
  });
}

function sendWorkspaceNotFound(response) {
  return response.status(404).json({
    success: false,
    error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found." },
  });
}

// Resolves the calendar an event is written to. Without an explicit
// workspace the event goes into the user's personal calendar.
async function resolveTargetWorkspace(workspaceId, userId, response) {
  if (!workspaceId) {
    const personal = await prisma.workspaceMember.findFirst({
      where: { userId, workspace: { type: "PERSONAL", ownerId: userId } },
      orderBy: { workspace: { createdAt: "asc" } },
      select: { workspaceId: true },
    });

    if (!personal) {
      sendWorkspaceNotFound(response);
      return null;
    }

    return personal.workspaceId;
  }

  const membership = await getWorkspaceMembership(workspaceId, userId);

  if (!membership) {
    sendWorkspaceNotFound(response);
    return null;
  }

  if (!workspaceWriteRoles.includes(membership.role)) {
    sendWorkspaceForbidden(response);
    return null;
  }

  return workspaceId;
}

// Creators can change their own events; owners and admins can change all
// events in their workspace. Events outside the user's workspaces stay hidden.
async function findEditableEvent(eventId, userId, response) {
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, workspace: workspaceMembershipWhere(userId) },
    include: {
      workspace: {
        select: { members: { where: { userId }, select: { role: true } } },
      },
    },
  });

  if (!event) {
    sendEventNotFound(response);
    return null;
  }

  const role = event.workspace.members[0]?.role;
  const isCreator = event.ownerId === userId;

  if (
    !workspaceWriteRoles.includes(role) ||
    (!isCreator && !workspaceManageRoles.includes(role))
  ) {
    sendWorkspaceForbidden(response);
    return null;
  }

  return event;
}

export async function createEvent(request, response, next) {
  try {
    const { workspaceId: requestedWorkspaceId, ...eventData } = request.body;
    const workspaceId = await resolveTargetWorkspace(
      requestedWorkspaceId,
      request.user.id,
      response,
    );

    if (!workspaceId) {
      return;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        ...eventData,
        ownerId: request.user.id,
        workspaceId,
      },
      include: eventInclude,
    });

    return response.status(201).json({
      success: true,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEvents(request, response, next) {
  try {
    const { from, to } = request.validatedQuery;
    const events = await prisma.calendarEvent.findMany({
      where: {
        workspace: workspaceMembershipWhere(request.user.id),
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      include: eventInclude,
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    });

    return response.status(200).json({
      success: true,
      data: { events },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(request, response, next) {
  try {
    const { eventId } = request.validatedParams;
    const existingEvent = await findEditableEvent(
      eventId,
      request.user.id,
      response,
    );

    if (!existingEvent) {
      return;
    }

    const { workspaceId: requestedWorkspaceId, ...eventData } = request.body;
    let workspaceId = existingEvent.workspaceId;

    if (requestedWorkspaceId && requestedWorkspaceId !== workspaceId) {
      workspaceId = await resolveTargetWorkspace(
        requestedWorkspaceId,
        request.user.id,
        response,
      );

      if (!workspaceId) {
        return;
      }
    }

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: { ...eventData, workspaceId },
      include: eventInclude,
    });

    return response.status(200).json({
      success: true,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(request, response, next) {
  try {
    const { eventId } = request.validatedParams;
    const existingEvent = await findEditableEvent(
      eventId,
      request.user.id,
      response,
    );

    if (!existingEvent) {
      return;
    }

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
