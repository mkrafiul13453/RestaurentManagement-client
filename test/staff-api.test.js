import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
const { listStaff, updateStaffRole } = await import("../lib/staff-api.js");

const staffRecord = {
  id: "staff-1",
  name: "Restora Staff",
  email: "staff@example.com",
  role: "manager",
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("staff API paginates, searches, filters roles, and validates safe records", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return Response.json({
      success: true,
      data: { staff: [staffRecord] },
      meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
  };

  try {
    const response = await listStaff({
      page: 2,
      limit: 10,
      search: "staff",
      role: "manager",
    });
    assert.deepEqual(response.data.staff, [staffRecord]);
    assert.equal(requestedUrl.searchParams.get("page"), "2");
    assert.equal(requestedUrl.searchParams.get("limit"), "10");
    assert.equal(requestedUrl.searchParams.get("search"), "staff");
    assert.equal(requestedUrl.searchParams.get("role"), "manager");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("staff API rejects records containing authentication fields", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    data: { staff: [{ ...staffRecord, password: "must-not-leak" }] },
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });

  try {
    await assert.rejects(listStaff(), /invalid staff list/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("role updates use the narrow staff endpoint and validate the response", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = new URL(url);
    requestOptions = options;
    return Response.json({
      success: true,
      data: { staff: { ...staffRecord, role: "chef" } },
      message: "Staff role updated",
      error: null,
    });
  };

  try {
    const updated = await updateStaffRole("staff-1", "manager", "chef");
    assert.equal(updated.role, "chef");
    assert.equal(requestUrl.pathname, "/api/v1/staff/staff-1/role");
    assert.equal(requestOptions.method, "PATCH");
    assert.deepEqual(JSON.parse(requestOptions.body), {
      expectedRole: "manager",
      role: "chef",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
