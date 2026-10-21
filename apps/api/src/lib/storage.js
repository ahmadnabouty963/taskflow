import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 speaks the S3 API. Buckets created with the EU jurisdiction
// live behind a separate endpoint.
const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

let client;

// Automated tests never talk to Cloudflare: STORAGE_DRIVER=memory keeps
// objects in this map, and tests "upload" by writing into it.
export const memoryStorage = new Map();
const useMemory = () => process.env.STORAGE_DRIVER === "memory";

export function isStorageConfigured() {
  if (useMemory()) return true;
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

function storageClient() {
  if (!client) {
    const jurisdiction = process.env.R2_JURISDICTION ? `.${process.env.R2_JURISDICTION}` : "";
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}${jurisdiction}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

const bucket = () => process.env.R2_BUCKET;

// The signature covers the content type and length, so the browser cannot
// upload a different kind or size of file than the one the API approved.
export async function createUploadUrl({ key, contentType, size }) {
  if (useMemory()) return `memory://upload/${key}`;
  return getSignedUrl(
    storageClient(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

export async function createDownloadUrl({ key, fileName, inline }) {
  if (useMemory()) return `memory://download/${key}?inline=${inline ? 1 : 0}`;
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  return getSignedUrl(
    storageClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}

// Returns the stored size and type, or null when the browser never uploaded.
export async function findStoredObject(key) {
  if (useMemory()) return memoryStorage.get(key) ?? null;
  try {
    const head = await storageClient().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return { size: head.ContentLength, contentType: head.ContentType };
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === "NotFound") return null;
    throw error;
  }
}

export async function deleteStoredObjects(keys) {
  if (useMemory()) {
    keys.forEach((key) => memoryStorage.delete(key));
    return;
  }
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    if (batch.length === 0) continue;
    await storageClient().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}
