import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
const { apiGet } = await import("../lib/api.js");

test("API requests preserve abort errors for cancelled searches and navigation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new DOMException("The request was aborted", "AbortError");
  };

  try {
    await assert.rejects(
      apiGet("/menu-items", { signal: new AbortController().signal }),
      (error) => error.name === "AbortError",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
