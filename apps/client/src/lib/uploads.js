import { apiRequest } from "./api.js";

// Uploads run in three steps: the API approves the file and returns a signed
// URL, the browser sends the file straight to storage, and the API verifies
// the stored object before the file becomes visible.
function putFile(upload, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(upload.method, upload.url);
    Object.entries(upload.headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Upload failed (${request.status}).`));
    });
    request.addEventListener("error", () => reject(new Error("Upload failed. Check your connection.")));
    request.send(file);
  });
}

export async function uploadFile({ requestPath, file, extra = {}, onProgress }) {
  const started = await apiRequest(requestPath, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name || "image",
      contentType: file.type,
      size: file.size,
      ...extra,
    }),
  });
  await putFile(started.data.upload, file, onProgress);
  const completed = await apiRequest(
    `/api/attachments/${started.data.attachment.id}/complete`,
    { method: "POST" },
  );
  return completed.data.attachment;
}

export function formatFileSize(bytes, locale) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`;
}
