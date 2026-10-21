import prisma from "../lib/prisma.js";
import { createDownloadUrl, isStorageConfigured } from "../lib/storage.js";
import {
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceWriteRoles,
} from "../lib/workspace-access.js";

const whiteboardSelect = {
  elements: true,
  version: true,
  updatedAt: true,
  updatedBy: { select: { id: true, name: true } },
};

const emptyWhiteboard = {
  elements: [],
  version: 0,
  updatedAt: null,
  updatedBy: null,
};

async function findProjectRole(projectId, userId, response) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  const membership = project
    ? await getWorkspaceMembership(project.workspaceId, userId)
    : null;

  if (!membership) {
    response.status(404).json({
      success: false,
      error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
    });
    return null;
  }

  return membership.role;
}

async function whiteboardFiles(projectId) {
  if (!isStorageConfigured()) return [];
  const attachments = await prisma.attachment.findMany({
    where: { projectId, kind: "WHITEBOARD", status: "READY" },
    select: { whiteboardFileId: true, contentType: true, storageKey: true, fileName: true },
  });
  return Promise.all(
    attachments.map(async (attachment) => ({
      fileId: attachment.whiteboardFileId,
      mimeType: attachment.contentType,
      url: await createDownloadUrl({ key: attachment.storageKey, fileName: attachment.fileName, inline: true }),
    })),
  );
}

async function currentWhiteboard(projectId) {
  return (
    (await prisma.whiteboard.findUnique({
      where: { projectId },
      select: whiteboardSelect,
    })) ?? emptyWhiteboard
  );
}

export async function getWhiteboard(request, response, next) {
  try {
    const { projectId } = request.validatedParams;
    const role = await findProjectRole(projectId, request.user.id, response);
    if (!role) return;

    return response.status(200).json({
      success: true,
      data: {
        whiteboard: await currentWhiteboard(projectId),
        files: await whiteboardFiles(projectId),
        canEdit: workspaceWriteRoles.includes(role),
        uploadsEnabled: isStorageConfigured() && workspaceWriteRoles.includes(role),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Saves are versioned: a save based on an outdated version is rejected so
// two members never silently overwrite each other's drawings.
export async function saveWhiteboard(request, response, next) {
  try {
    const { projectId } = request.validatedParams;
    const { elements, baseVersion } = request.body;
    const role = await findProjectRole(projectId, request.user.id, response);
    if (!role) return;

    if (!workspaceWriteRoles.includes(role)) {
      return sendWorkspaceForbidden(response);
    }

    let saved = false;

    if (baseVersion === 0) {
      try {
        await prisma.whiteboard.create({
          data: { projectId, elements, version: 1, updatedById: request.user.id },
        });
        saved = true;
      } catch (error) {
        if (error.code !== "P2002") throw error;
      }
    } else {
      const result = await prisma.whiteboard.updateMany({
        where: { projectId, version: baseVersion },
        data: {
          elements,
          version: { increment: 1 },
          updatedById: request.user.id,
        },
      });
      saved = result.count === 1;
    }

    const whiteboard = await currentWhiteboard(projectId);

    if (!saved) {
      return response.status(409).json({
        success: false,
        error: {
          code: "WHITEBOARD_CONFLICT",
          message: "Someone else changed this whiteboard. Load the latest version first.",
        },
        data: { whiteboard },
      });
    }

    return response.status(200).json({ success: true, data: { whiteboard } });
  } catch (error) {
    next(error);
  }
}
