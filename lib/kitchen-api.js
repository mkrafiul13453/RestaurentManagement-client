import { apiGet } from "@/lib/api";

const kitchenStatuses = new Set(["confirmed", "preparing"]);

export async function listKitchenOrders({
  page = 1,
  limit = 20,
  status,
  signal,
} = {}) {
  const response = await apiGet("/kitchen", {
    query: { page, limit, status },
    signal,
  });
  const { orders } = response?.data ?? {};
  const { meta } = response ?? {};
  if (
    !Array.isArray(orders) ||
    !orders.every((order) =>
      order &&
      typeof order._id === "string" &&
      kitchenStatuses.has(order.status) &&
      Array.isArray(order.lines),
    ) ||
    !meta ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.limit) ||
    !Number.isInteger(meta.total) ||
    !Number.isInteger(meta.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid kitchen queue");
  }
  return response;
}
