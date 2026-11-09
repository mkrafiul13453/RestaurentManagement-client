import { apiGet, apiRequest } from "./api.js";

const notificationTypes = new Set([
  "order_status_changed",
  "reservation_status_changed",
  "payment_status_changed",
]);

function isNotification(notification) {
  return notification &&
    typeof notification.id === "string" &&
    notificationTypes.has(notification.type) &&
    ["order", "reservation", "payment"].includes(notification.resourceType) &&
    typeof notification.resourceId === "string" &&
    typeof notification.previousStatus === "string" &&
    typeof notification.newStatus === "string" &&
    typeof notification.isRead === "boolean" &&
    (notification.readAt === null || typeof notification.readAt === "string") &&
    typeof notification.createdAt === "string" &&
    Object.keys(notification).every((key) =>
      [
        "id",
        "type",
        "resourceType",
        "resourceId",
        "previousStatus",
        "newStatus",
        "isRead",
        "readAt",
        "createdAt",
      ].includes(key),
    );
}

export async function listNotifications({ page = 1, limit = 10, isRead, signal } = {}) {
  const response = await apiGet("/notifications", {
    query: {
      page,
      limit,
      isRead: isRead === undefined ? undefined : String(isRead),
    },
    signal,
  });
  const meta = response?.meta;
  if (
    !Array.isArray(response?.data?.notifications) ||
    !response.data.notifications.every(isNotification) ||
    !Number.isInteger(meta?.page) ||
    !Number.isInteger(meta?.limit) ||
    !Number.isInteger(meta?.total) ||
    !Number.isInteger(meta?.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid notification list");
  }
  return response;
}

export async function updateNotificationReadState(id, isRead) {
  const response = await apiRequest(
    `/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "PATCH",
      body: JSON.stringify({ isRead }),
    },
  );
  if (!isNotification(response?.data?.notification) ||
    response.data.notification.id !== id ||
    response.data.notification.isRead !== isRead) {
    throw new Error("The Restora server returned an invalid notification");
  }
  return response.data.notification;
}
