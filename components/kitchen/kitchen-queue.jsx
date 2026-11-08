"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { changeOrderStatus } from "@/lib/orders-api";
import { listKitchenOrders } from "@/lib/kitchen-api";
import { useKitchenRealtime } from "@/lib/kitchen-realtime";

const pageSize = 10;

function orderAge(createdAt, now) {
  if (!createdAt) return "Age unavailable";
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return "Age unavailable";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return "Less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function KitchenQueue() {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(Date.now());

  const requestRefresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const live = useKitchenRealtime(requestRefresh);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const loadQueue = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listKitchenOrders({
        page,
        limit: pageSize,
        status: status || undefined,
        signal,
      });
      setOrders(response.data.orders);
      setMeta(response.meta);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, refreshKey, status]);

  useEffect(() => {
    const controller = new AbortController();
    void loadQueue(controller.signal);
    return () => controller.abort();
  }, [loadQueue]);

  async function markReady(order) {
    setBusyOrderId(order._id);
    setNotice("");
    try {
      await changeOrderStatus(order._id, "preparing", "ready");
      requestRefresh();
    } catch (error) {
      setNotice(error.message);
      requestRefresh();
    } finally {
      setBusyOrderId("");
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
              {live ? "Live updates connected" : "Reconnecting to live updates"}
            </span>
            <Button onClick={requestRefresh} variant="secondary">Refresh queue</Button>
          </div>
        }
        description="Confirmed and preparing orders, sorted oldest first. Order actions are performed through the secure API."
        eyebrow="Chef workspace"
        title="Kitchen queue"
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="status">
          {notice}
        </p>
      )}

      <Card className="mb-5 p-4">
        <label className="block max-w-xs text-sm font-medium text-stone-700">
          Filter queue
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            value={status}
          >
            <option value="">All active kitchen orders</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
          </select>
        </label>
      </Card>

      {loading ? (
        <LoadingState label="Loading the kitchen queue..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="The kitchen queue could not be loaded. Check your connection and try again."
          onRetry={requestRefresh}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          description={status ? `There are no ${status} orders on this page.` : "Confirmed and preparing orders will appear here."}
          title="Kitchen queue is clear"
        />
      ) : (
        <section aria-label="Kitchen orders" className="space-y-4">
          {orders.map((order) => (
            <Card className="p-5 sm:p-6" key={order._id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold text-stone-950">
                    Order {order._id.slice(-6).toUpperCase()}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Received{" "}
                    <time dateTime={order.createdAt}>
                      {orderAge(order.createdAt, now)} ago
                    </time>
                  </p>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${order.status === "confirmed" ? "bg-sky-100 text-sky-900" : "bg-orange-100 text-orange-900"}`}>
                  {order.status}
                </span>
              </div>

              <ul className="mt-4 divide-y divide-stone-100 border-y border-stone-100">
                {order.lines.map((line, index) => (
                  <li className="flex items-center justify-between gap-4 py-3" key={`${line.menuItemId ?? line.nameSnapshot}-${index}`}>
                    <span className="font-medium text-stone-800">{line.nameSnapshot}</span>
                    <span className="rounded-lg bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-800">
                      × {line.quantity}
                    </span>
                  </li>
                ))}
              </ul>

              {order.status === "confirmed" ? (
                <div className="mt-4">
                  <Button disabled variant="secondary">Start preparing</Button>
                  <p className="mt-2 text-xs text-stone-500">
                    Preparation is disabled until order stock reservation is implemented (T36).
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <Button
                    loading={busyOrderId === order._id}
                    onClick={() => markReady(order)}
                  >
                    Mark ready
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      {!loading && !loadError && meta.totalPages > 1 && (
        <nav aria-label="Kitchen queue pages" className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="secondary">Previous</Button>
            <Button disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
          </div>
        </nav>
      )}
    </>
  );
}
