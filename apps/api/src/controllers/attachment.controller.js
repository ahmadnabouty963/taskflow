import {
  cleanupStalePendingUploads,
  imageContentTypes,
  MAX_TASK_FILE_BYTES,
  MAX_WHITEBOARD_IMAGE_BYTES,
  removeAttachmentFiles,
  sanitizeFileName,
  serializeAttachment,
  storageKeyFor,
  taskContentTypes,
  WORKSPACE_QUOTA_BYTES,
  workspaceUsage,
} from "../lib/attachments.js";
import prisma from "../lib/prisma.js";
import { createUploadUrl, findStoredObject, isStorageConfigured } from "../lib/storage.js";
import {
  getWorkspaceMembership,
  sendWorkspaceForbidden,
  workspaceManageRoles,
  workspaceWriteRoles,
} from "../lib/workspace-access.js";

const uploadedBySelect = { uploadedBy: { select: { id: true, name: true } } };

function sendError(response, status, code, message) {
  return response.status(status).json({ success: false, error: { code, message } });
}

function sendStorageUnavailable(response) {
  return sendError(response, 503, "STORAGE_NOT_CONFIGURED", "File uploads are not available yet.");
}

// Resolves the project and the user's role in its workspace, answering 404
// for people outside the workspace so they cannot probe for projects.
async function projectAccess(projectId, userId, response) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });
  const membership = project ? await getWorkspaceMembership(project.workspaceId, userId) : null;

  if (!membership) {
    sendError(response, 404, "PROJECT_NOT_FOUND", "Project not found.");
    return null;
  }

  return { project, role: membership.role };
}

function canDeleteAttachment(attachment, userId, role) {
  return (
    workspaceWriteRoles.includes(role) &&
    (attachment.uploadedById === userId || workspaceManageRoles.includes(role))
  );
}

async function startUpload(request, response, { project, kind, taskId, whiteboardFileId, allowedTypes, maxBytes }) {
  const { fileName, contentType, size } = request.body;

  if (!allowedTypes.has(contentType)) {
    return sendError(response, 422, "FILE_TYPE_NOT_ALLOWED", "This file type is not allowed.");
  }

  if (size > maxBytes) {
    return sendError(response, 413, "FILE_TOO_LARGE", `Files can be at most ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  await cleanupStalePendingUploads(project.workspaceId);

  if ((await workspaceUsage(project.workspaceId)) + size > WORKSPACE_QUOTA_BYTES) {
    return sendError(response, 507, "WORKSPACE_STORAGE_FULL", "This workspace has used all of its file storage.");
  }

  const storageKey = storageKeyFor(project.workspaceId, kind);
  const attachment = await prisma.attachment.create({
    data: {
      kind,
      fileName: sanitizeFileName(fileName),
      contentType,
      size,
      storageKey,
      workspaceId: project.workspaceId,
      projectId: project.id,
      taskId,
      whiteboardFileId,
      uploadedById: request.user.id,
    },
  });

  return response.status(201).json({
    success: true,
    data: {
      attachment: { id: attachment.id },
      upload: {
        url: await createUploadUrl({ key: storageKey, contentType, size }),
        method: "PUT",
        headers: { "Content-Type": contentType },
      },
    },
  });
}

export async function requestTaskUpload(request, response, next) {
  try {
    if (!isStorageConfigured()) return sendStorageUnavailable(response);
    const { projectId, taskId } = request.validatedParams;
    const access = await projectAccess(projectId, request.user.id, response);
    if (!access) return;
    if (!workspaceWriteRoles.includes(access.role)) return sendWorkspaceForbidden(response);

    const task = await prisma.task.findFirst({ where: { id: taskId, projectId }, select: { id: true } });
    if (!task) return sendError(response, 404, "TASK_NOT_FOUND", "Task not found.");

    return startUpload(request, response, {
      project: access.project,
      kind: "TASK",
      taskId,
      whiteboardFileId: null,
      allowedTypes: taskContentTypes,
      maxBytes: MAX_TASK_FILE_BYTES,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestWhiteboardUpload(request, response, next) {
  try {
    if (!isStorageConfigured()) return sendStorageUnavailable(response);
    const { projectId } = request.validatedParams;
    const access = await projectAccess(projectId, request.user.id, response);
    if (!access) return;
    if (!workspaceWriteRoles.includes(access.role)) return sendWorkspaceForbidden(response);

    const existing = await prisma.attachment.findUnique({
      where: { projectId_whiteboardFileId: { projectId, whiteboardFileId: request.body.fileId } },
      select: { status: true },
    });
    if (existing?.status === "READY") {
      return sendError(response, 409, "WHITEBOARD_FILE_EXISTS", "This image is already stored.");
    }
    if (existing) {
      await prisma.attachment.delete({
        where: { projectId_whiteboardFileId: { projectId, whiteboardFileId: request.body.fileId } },
      });
    }

    return startUpload(request, response, {
      project: access.project,
      kind: "WHITEBOARD",
      taskId: null,
      whiteboardFileId: request.body.fileId,
      allowedTypes: imageContentTypes,
      maxBytes: MAX_WHITEBOARD_IMAGE_BYTES,
    });
  } catch (error) {
    next(error);
  }
}

// The browser uploads straight to storage. Only after the stored object is
// checked against the approved size and type does the file become visible.
export async function completeUpload(request, response, next) {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: request.validatedParams.attachmentId },
    });

    if (!attachment || attachment.uploadedById !== request.user.id) {
      return sendError(response, 404, "ATTACHMENT_NOT_FOUND", "Attachment not found.");
    }

    if (attachment.status === "READY") {
      return response.status(200).json({ success: true, data: { attachment: { id: attachment.id } } });
    }

    const stored = await findStoredObject(attachment.storageKey);
    const matches = stored && stored.size === attachment.size && stored.contentType === attachment.contentType;

    if (!matches) {
      await prisma.attachment.delete({ where: { id: attachment.id } });
      if (stored) await removeAttachmentFiles([attachment.storageKey]);
      return sendError(response, 422, "UPLOAD_INCOMPLETE", "The file was not uploaded completely. Please try again.");
    }

    const ready = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { status: "READY" },
      include: uploadedBySelect,
    });

    return response.status(200).json({
      success: true,
      data: { attachment: await serializeAttachment(ready, { canDelete: true }) },
    });
  } catch (error) {
    next(error);
  }
}

export async function listTaskAttachments(request, response, next) {
  try {
    const { projectId, taskId } = request.validatedParams;
    const access = await projectAccess(projectId, request.user.id, response);
    if (!access) return;

    const attachments = await prisma.attachment.findMany({
      where: { taskId, projectId, kind: "TASK", status: "READY" },
      include: uploadedBySelect,
      orderBy: { createdAt: "desc" },
    });

    return response.status(200).json({
      success: true,
      data: {
        attachments: isStorageConfigured()
          ? await Promise.all(
              attachments.map((attachment) =>
                serializeAttachment(attachment, {
                  canDelete: canDeleteAttachment(attachment, request.user.id, access.role),
                }),
              ),
            )
          : [],
        uploadsEnabled: isStorageConfigured() && workspaceWriteRoles.includes(access.role),
        limits: { maxBytes: MAX_TASK_FILE_BYTES, contentTypes: [...taskContentTypes] },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttachment(request, response, next) {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: request.validatedParams.attachmentId },
    });
    const membership = attachment
      ? await getWorkspaceMembership(attachment.workspaceId, request.user.id)
      : null;

    if (!attachment || !membership) {
      return sendError(response, 404, "ATTACHMENT_NOT_FOUND", "Attachment not found.");
    }

    if (!canDeleteAttachment(attachment, request.user.id, membership.role)) {
      return sendWorkspaceForbidden(response);
    }

    await prisma.attachment.delete({ where: { id: attachment.id } });
    await removeAttachmentFiles([attachment.storageKey]);
    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
