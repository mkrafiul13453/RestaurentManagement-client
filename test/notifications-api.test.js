import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
const {
  listNotifications,
  updateNotificationReadState,
} = await import("../lib/notifications-api.js");

const notification = {
  id: "notification-1",
  type: "order_status_changed",
  resourceType: "order",
  resourceId: "order-1",
  previousStatus: "pending",
  newStatus: "confirmed",
  isRead: false,
  readAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("notification API validates and paginates recipient inbox results", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return Response.json({
      success: true,
      data: { notifications: [notification] },
      meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
  };

  try {
    const response = await listNotifications({ page: 2, limit: 10, isRead: false });
    assert.deepEqual(response.data.notifications, [notification]);
    assert.equal(requestedUrl.searchParams.get("page"), "2");
    assert.equal(requestedUrl.searchParams.get("limit"), "10");
    assert.equal(requestedUrl.searchParams.get("isRead"), "false");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("notification API rejects sensitive or unsupported fields", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    data: { notifications: [{ ...notification, recipientId: "another-user" }] },
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });

  try {
    await assert.rejects(listNotifications(), /invalid notification list/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("notification read updates use the recipient-scoped API and validate state", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = new URL(url);
    requestOptions = options;
    return Response.json({
      success: true,
      data: { notification: { ...notification, isRead: true, readAt: notification.createdAt } },
      message: "Notification read state updated",
    });
  };

  try {
    const updated = await updateNotificationReadState(notification.id, true);
    assert.equal(updated.isRead, true);
    assert.equal(requestUrl.pathname, "/api/v1/notifications/notification-1/read");
    assert.equal(requestOptions.method, "PATCH");
    assert.deepEqual(JSON.parse(requestOptions.body), { isRead: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
