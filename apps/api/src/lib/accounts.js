import { removeAttachmentFiles, storageKeysWhere } from "./attachments.js";
import prisma from "./prisma.js";

// Owned workspaces are deleted with the account, and with them every stored
// file. Files are removed after the database rows, so a failed file deletion
// never leaves a half-deleted account behind.
export async function deleteUserWithFiles(userId) {
  const storageKeys = await storageKeysWhere({ workspace: { ownerId: userId } });
  await prisma.user.delete({ where: { id: userId } });
  await removeAttachmentFiles(storageKeys);
}
