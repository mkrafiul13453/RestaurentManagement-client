import { apiGet, apiRequest } from "@/lib/api";
import { listMenuItems as fetchMenuItems } from "@/lib/catalog-api";

const orderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

export async function listMenuItems({ page = 1, limit = 100, signal } = {}) {
  return fetchMenuItems({ page, limit, signal });
}

export async function listOrders({ page = 1, limit = 20, status, signal } = {}) {
  const response = await apiGet("/orders", {
    query: { page, limit, status: status || undefined },
    signal,
  });
  const orders = response?.data?.orders;
  const meta = response?.meta;
  if (
    !Array.isArray(orders) ||
    !orders.every((order) =>
      order &&
      typeof order._id === "string" &&
      orderStatuses.includes(order.status) &&
      (order.lines === undefined || Array.isArray(order.lines)),
    ) ||
    !meta ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.limit) ||
    !Number.isInteger(meta.total) ||
    !Number.isInteger(meta.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid order list");
  }
  return response;
}

export async function createOrder({ items, tableId }) {
  const response = await apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify({ items, ...(tableId ? { tableId } : {}) }),
  });
  const order = response?.data?.order;
  if (!order || typeof order._id !== "string" || !Array.isArray(order.lines)) {
    throw new Error("The Restora server returned an invalid order");
  }
  return order;
}

export async function changeOrderStatus(id, expectedStatus, status) {
  const response = await apiRequest(`/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ expectedStatus, status }),
  });
  return response?.data?.order;
}
