import { apiGet, apiRequest } from "@/lib/api";

export async function listReservationTables({ signal } = {}) {
  const response = await apiGet("/reservations/tables", { signal });
  if (!Array.isArray(response?.data?.tables)) {
    throw new Error("The Restora server returned an invalid reservation table list");
  }
  return response.data.tables;
}

export async function listReservations({
  page = 1,
  limit = 20,
  date,
  status,
  tableId,
  signal,
} = {}) {
  const response = await apiGet("/reservations", {
    query: { page, limit, date, status, tableId },
    signal,
  });
  if (
    !Array.isArray(response?.data?.reservations) ||
    !Number.isInteger(response?.meta?.page) ||
    !Number.isInteger(response?.meta?.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid reservation list");
  }
  return response;
}

async function save(path, method, fields) {
  const response = await apiRequest(path, {
    method,
    body: JSON.stringify(fields),
  });
  const reservation = response?.data?.reservation;
  if (!reservation || typeof reservation._id !== "string") {
    throw new Error("The Restora server returned an invalid reservation");
  }
  return reservation;
}

export function createReservation(fields) {
  return save("/reservations", "POST", fields);
}

export function updateReservation(id, fields) {
  return save(`/reservations/${encodeURIComponent(id)}`, "PATCH", fields);
}

export function cancelReservation(id) {
  return save(`/reservations/${encodeURIComponent(id)}/cancel`, "PATCH", {});
}
