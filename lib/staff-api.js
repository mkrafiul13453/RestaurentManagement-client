import { apiGet, apiRequest } from "./api.js";
import { roleConfig } from "./roles.js";

const validRoles = new Set(Object.keys(roleConfig));

function isSafeStaffRecord(staff) {
  return staff &&
    typeof staff.id === "string" &&
    typeof staff.name === "string" &&
    typeof staff.email === "string" &&
    validRoles.has(staff.role) &&
    Object.keys(staff).every((key) =>
      ["id", "name", "email", "role", "createdAt"].includes(key),
    );
}

export async function listStaff({
  page = 1,
  limit = 10,
  search,
  role,
  signal,
} = {}) {
  const response = await apiGet("/staff", {
    query: { page, limit, search, role },
    signal,
  });
  const meta = response?.meta;
  if (
    !Array.isArray(response?.data?.staff) ||
    !response.data.staff.every(isSafeStaffRecord) ||
    !Number.isInteger(meta?.page) ||
    !Number.isInteger(meta?.limit) ||
    !Number.isInteger(meta?.total) ||
    !Number.isInteger(meta?.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid staff list");
  }
  return response;
}

export async function updateStaffRole(id, expectedRole, role) {
  const response = await apiRequest(`/staff/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ expectedRole, role }),
  });
  if (!isSafeStaffRecord(response?.data?.staff) || response.data.staff.role !== role) {
    throw new Error("The Restora server returned an invalid staff role update");
  }
  return response.data.staff;
}
