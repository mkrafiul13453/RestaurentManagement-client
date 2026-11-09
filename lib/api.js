const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl(path) {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be set to the Restora server origin");
  }
  let serverOrigin;
  try {
    serverOrigin = new URL(apiBaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid HTTP or HTTPS origin");
  }
  if (
    !["http:", "https:"].includes(serverOrigin.protocol) ||
    serverOrigin.pathname !== "/" ||
    serverOrigin.search ||
    serverOrigin.hash
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid HTTP or HTTPS origin without a path");
  }
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API paths must be relative to /api/v1");
  }

  return `${serverOrigin.origin}/api/v1${path}`;
}

function addQuery(path, query = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const serialized = searchParams.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export async function apiRequest(path, options = {}) {
  const url = getApiUrl(path);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("Could not reach the Restora server", { cause: error });
  }

  if (response.status === 204) return null;

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The Restora server returned an invalid response", { cause: error });
  }

  if (!response.ok || body.success !== true) {
    throw new Error(body.message || body.error?.message || "Restora request failed");
  }

  return body;
}

export function apiGet(path, { query, ...options } = {}) {
  return apiRequest(addQuery(path, query), { ...options, method: "GET" });
}

export function apiPost(path, data) {
  return apiRequest(path, { method: "POST", body: JSON.stringify(data) });
}
