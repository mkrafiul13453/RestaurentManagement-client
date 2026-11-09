"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { listNotifications, updateNotificationReadState } from "@/lib/notifications-api";
import { roleConfig } from "@/lib/roles";

const pageSize = 10;

const eventLabels = {
  order_status_changed: "Order status changed",
  reservation_status_changed: "Reservation status changed",
  payment_status_changed: "Payment status changed",
};

export function NotificationInbox({ role }) {
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const canGoBack = page > 1;
  const canGoForward = page < meta.totalPages;

  const loadNotifications = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listNotifications({
        page,
        limit: pageSize,
        isRead: readFilter === "" ? undefined : readFilter === "read",
        signal,
      });
      setNotifications(response.data.notifications);
      setMeta(response.meta);
    } catch (failure) {
      if (failure.name !== "AbortError") setError(failure);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, readFilter, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    void loadNotifications(controller.signal);
    return () => controller.abort();
  }, [loadNotifications]);

  useEffect(() => {
    const lastPage = Math.max(1, meta.totalPages);
    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [meta.totalPages, page]);

  async function changeReadState(notification) {
    setBusyId(notification.id);
    setNotice("");
    try {
      const updated = await updateNotificationReadState(
        notification.id,
        !notification.isRead,
      );
      if (readFilter && (readFilter === "read") !== updated.isRead) {
        setRefreshKey((key) => key + 1);
      } else {
        setNotifications((current) => current.map((item) =>
          item.id === updated.id ? updated : item,
        ));
      }
      setNotice(updated.isRead ? "Notification marked as read." : "Notification marked as unread.");
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader
        actions={<Button onClick={() => setRefreshKey((key) => key + 1)} variant="secondary">Refresh</Button>}
        description={`Status updates for your ${roleConfig[role].label.toLowerCase()} account. Only notifications addressed to your account are shown.`}
        eyebrow="Your inbox"
        title="Notifications"
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="status">
          {notice}
        </p>
      )}

      <Card className="mb-5 p-4">
        <label className="block max-w-xs text-sm font-medium text-stone-700">
          Show
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
            onChange={(event) => {
              setPage(1);
              setReadFilter(event.target.value);
            }}
            value={readFilter}
          >
            <option value="">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
      </Card>

      {loading ? (
        <LoadingState label="Loading notifications..." />
      ) : error ? (
        <ErrorState
          error={error}
          message="We couldn't load your notifications. Check your connection and try again."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          description={readFilter ? `There are no ${readFilter} notifications.` : "Status updates for your account will appear here."}
          title="Your inbox is clear"
        />
      ) : (
        <section aria-label="Notifications" className="space-y-3">
          {notifications.map((notification) => (
            <Card
              className={`p-4 sm:p-5 ${notification.isRead ? "border-stone-200" : "border-orange-300 bg-orange-50/50"}`}
              key={notification.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-stone-950">{eventLabels[notification.type]}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${notification.isRead ? "bg-stone-100 text-stone-700" : "bg-orange-100 text-orange-900"}`}>
                      {notification.isRead ? "Read" : "Unread"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-700">
                    {notification.resourceType} {notification.resourceId.slice(-6).toUpperCase()} status changed from{" "}
                    <strong className="capitalize">{notification.previousStatus}</strong> to{" "}
                    <strong className="capitalize">{notification.newStatus}</strong>.
                  </p>
                  <time className="mt-2 block text-xs text-stone-500" dateTime={notification.createdAt}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </time>
                </div>
                <Button
                  disabled={Boolean(busyId && busyId !== notification.id)}
                  loading={busyId === notification.id}
                  onClick={() => changeReadState(notification)}
                  size="sm"
                  variant="secondary"
                >
                  Mark as {notification.isRead ? "unread" : "read"}
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {!loading && !error && meta.totalPages > 1 && (
        <nav aria-label="Notification pages" className="mt-6 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-stone-600">
            Page {meta.page} of {meta.totalPages} · {meta.total} notifications
          </p>
          <div className="flex gap-2">
            <Button
              disabled={!canGoBack}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={!canGoForward}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </>
  );
}
