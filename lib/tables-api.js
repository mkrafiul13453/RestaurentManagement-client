import { apiGet, apiRequest } from "@/lib/api";

function isTable(table) {
  return (
    table &&
    typeof table._id === "string" &&
    typeof table.label === "string" &&
    Number.isInteger(table.capacity) &&
    ["available", "occupied", "reserved"].includes(table.status)
  );
}

export async function listTables({ page = 1, limit = 12, search = "", status, signal } = {}) {
  const response = await apiGet("/tables", {
    query: { page, limit, search: search || undefined, status },
    signal,
  });
  const tables = response?.data?.tables;
  const meta = response?.meta;
  if (
    !Array.isArray(tables) ||
    !tables.every(isTable) ||
    !meta ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.limit) ||
    !Number.isInteger(meta.total) ||
    !Number.isInteger(meta.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid table list");
  }
  return response;
}

export async function createTable(fields) {
  return getTableResponse(await apiRequest("/tables", {
    method: "POST",
    body: JSON.stringify(fields),
  }));
}

export async function updateTable(id, fields) {
  return getTableResponse(await apiRequest(`/tables/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  }));
}

export async function updateTableStatus(id, status, expectedStatus) {
  return getTableResponse(await apiRequest(
    `/tables/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, expectedStatus }),
    },
  ));
}

export async function deleteTable(id) {
  return apiRequest(`/tables/${encodeURIComponent(id)}`, { method: "DELETE" });
}

function getTableResponse(response) {
  if (!isTable(response?.data?.table)) {
    throw new Error("The Restora server returned an invalid table");
  }
  return response.data.table;
}
