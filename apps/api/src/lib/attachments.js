import { randomUUID } from "node:crypto";
import prisma from "./prisma.js";
import { createDownloadUrl, deleteStoredObjects } from "./storage.js";

export const MAX_TASK_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_WHITEBOARD_IMAGE_BYTES = 5 * 1024 * 1024;
export const WORKSPACE_QUOTA_BYTES = 1024 * 1024 * 1024;

// An upload that was requested but never completed stops counting against
// the quota after this time and is cleaned up.
const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000;

// Raster images only: SVG can carry scripts and is never accepted.
export const imageContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const taskContentTypes = new Set([
  ...imageContentTypes,
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
]);

export function sanitizeFileName(fileName) {
  const baseName = String(fileName).split(/[\\/]/).pop() ?? "";
  const cleaned = baseName
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  return cleaned || "file";
}

export function storageKeyFor(workspaceId, kind) {
  return `workspaces/${workspaceId}/${kind.toLowerCase()}/${randomUUID()}`;
}

function stalePendingWhere(workspaceId) {
  return {
    workspaceId,
    status: "PENDING",
    createdAt: { lt: new Date(Date.now() - PENDING_UPLOAD_TTL_MS) },
  };
}

// Ready files plus recent pending uploads count, so parallel requests cannot
// slip past the quota before any of them completes.
export async function workspaceUsage(workspaceId) {
  const result = await prisma.attachment.aggregate({
    where: {
      workspaceId,
      OR: [
        { status: "READY" },
        { createdAt: { gte: new Date(Date.now() - PENDING_UPLOAD_TTL_MS) } },
      ],
    },
    _sum: { size: true },
  });
  return result._sum.size ?? 0;
}

// Deletes database rows first and the stored files afterwards. A failed file
// deletion only leaves an unreachable object behind, never a broken record.
export async function removeAttachmentFiles(keys) {
  if (keys.length === 0) return;
  try {
    await deleteStoredObjects(keys);
  } catch (error) {
    console.error("Could not delete stored files:", keys.length, error.message);
  }
}

export async function storageKeysWhere(where) {
  const attachments = await prisma.attachment.findMany({
    where,
    select: { storageKey: true },
  });
  return attachments.map(({ storageKey }) => storageKey);
}

export async function cleanupStalePendingUploads(workspaceId) {
  const keys = await storageKeysWhere(stalePendingWhere(workspaceId));
  if (keys.length === 0) return;
  await prisma.attachment.deleteMany({ where: stalePendingWhere(workspaceId) });
  await removeAttachmentFiles(keys);
}

export async function serializeAttachment(attachment, { canDelete }) {
  const isImage = imageContentTypes.has(attachment.contentType);
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
    createdAt: attachment.createdAt,
    uploadedBy: attachment.uploadedBy ?? null,
    isImage,
    canDelete,
    url: await createDownloadUrl({
      key: attachment.storageKey,
      fileName: attachment.fileName,
      inline: isImage,
    }),
    downloadUrl: await createDownloadUrl({
      key: attachment.storageKey,
      fileName: attachment.fileName,
      inline: false,
    }),
  };
}
