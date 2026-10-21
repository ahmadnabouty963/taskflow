const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return null;
  }

  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body?.error?.message ?? "An unexpected error occurred.");
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }

  return body;
}
