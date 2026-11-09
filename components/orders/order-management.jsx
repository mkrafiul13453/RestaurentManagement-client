"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { useOrderRealtime } from "@/lib/kitchen-realtime";
import { formatMoney } from "@/lib/money";
import { createCheckoutSession } from "@/lib/payments-api";
import { createReview, listReviews } from "@/lib/reviews-api";
import { listTables } from "@/lib/tables-api";
import {
  changeOrderStatus,
  createOrder,
  listMenuItems,
  listOrders,
} from "@/lib/orders-api";

const pageSize = 10;

const statusClassNames = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  preparing: "bg-orange-100 text-orange-900",
  ready: "bg-emerald-100 text-emerald-900",
  completed: "bg-stone-200 text-stone-800",
  cancelled: "bg-red-100 text-red-800",
};

function OrderStatus({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClassNames[status]}`}>
      {status}
    </span>
  );
}

function PaymentStatus({ status = "unpaid" }) {
  const styles = {
    unpaid: "bg-stone-100 text-stone-700",
    paid: "bg-emerald-100 text-emerald-800",
    refunded: "bg-sky-100 text-sky-800",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] ?? styles.unpaid}`}>
      {status}
    </span>
  );
}

function OrderComposer({ role, onCreated, setNotice }) {
  const canSeat = role !== "customer";
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listMenuItems({ signal: controller.signal }),
      canSeat ? listTables({ limit: 100, signal: controller.signal }) : Promise.resolve(null),
    ])
      .then(([items, tableResponse]) => {
        setMenuItems(items);
        const availableTables = (tableResponse?.data?.tables ?? [])
          .filter((table) => table.status === "available");
        setTables(availableTables);
        if (canSeat) {
          const requestedTable = new URLSearchParams(window.location.search).get("table");
          if (requestedTable && availableTables.some((table) => table._id === requestedTable)) {
            setTableId(requestedTable);
          }
        }
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(failure);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canSeat]);

  async function submit(event) {
    event.preventDefault();
    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (!items.length) {
      setNotice("Choose at least one menu item.");
      return;
    }

    setSaving(true);
    setNotice("");
    try {
      await createOrder({ items, tableId: canSeat ? tableId : "" });
      setQuantities({});
      setTableId("");
      setNotice("Order created. The server calculated the bill using current menu prices.");
      onCreated();
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-stone-950">Create an order</h2>
      {loading ? (
        <LoadingState compact label="Loading the available menu..." />
      ) : error ? (
        <ErrorState
          error={error}
          message="The menu could not be loaded. Check the catalog setup and try again."
          onRetry={() => window.location.reload()}
        />
      ) : menuItems.length === 0 ? (
        <EmptyState
          className="mt-4"
          description="An admin or manager must create an available menu item before orders can be placed."
          title="No available menu items"
        />
      ) : (
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {menuItems.map((item) => (
              <label className="rounded-xl border border-stone-200 p-3" key={item._id}>
                <span className="block font-semibold text-stone-900">{item.name}</span>
                <span className="mt-1 block text-sm text-stone-600">
                  {formatMoney(item.priceMinor)} per item
                </span>
                <span className="sr-only">Quantity for {item.name}</span>
                <input
                  aria-label={`Quantity for ${item.name}`}
                  className="mt-2 min-h-10 w-full rounded-lg border border-stone-300 px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
                  max={99}
                  min={0}
                  onChange={(event) => setQuantities((current) => ({
                    ...current,
                    [item._id]: Number(event.target.value),
                  }))}
                  type="number"
                  value={quantities[item._id] ?? 0}
                />
              </label>
            ))}
          </div>
          {canSeat && (
            <label className="block max-w-sm text-sm font-medium text-stone-700">
              Table (optional)
              <select
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
                onChange={(event) => setTableId(event.target.value)}
                value={tableId}
              >
                <option value="">No table</option>
                {tables.map((table) => (
                  <option key={table._id} value={table._id}>{table.label}</option>
                ))}
              </select>
            </label>
          )}
          <Button loading={saving} type="submit">Place order</Button>
        </form>
      )}
    </Card>
  );
}

function OrderActions({ order, role, busy, onChange, onCancel }) {
  const actions = [];
  if (order.status === "pending" && ["admin", "manager", "waiter"].includes(role)) {
    actions.push(["cancelled", "Cancel order"]);
  }
  if (order.status === "preparing" && role === "chef") {
    actions.push(["ready", "Mark ready"]);
  }

  let stockGateMessage = "";
  if (order.status === "pending" && ["admin", "manager", "waiter"].includes(role)) {
    stockGateMessage = "Confirmation is disabled until inventory reservation is implemented (T36). Pending orders may still be cancelled.";
  } else if (order.status === "confirmed" && role === "chef") {
    stockGateMessage = "Preparation is disabled until order stock reservation is implemented (T36).";
  } else if (
    order.status === "confirmed" &&
    ["admin", "manager", "waiter"].includes(role)
  ) {
    stockGateMessage = "Cancellation is disabled until reserved stock can be released (T36).";
  } else if (order.status === "ready" && role === "cashier") {
    stockGateMessage = "Completion is disabled until inventory consumption is implemented (T36).";
  }

  return actions.length || stockGateMessage ? (
    <div className="space-y-2">
      {stockGateMessage && <p className="max-w-sm text-xs leading-5 text-stone-500">{stockGateMessage}</p>}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map(([nextStatus, label]) => nextStatus === "cancelled" ? (
            <Button
              disabled={busy}
              key={nextStatus}
              onClick={() => onCancel(order)}
              size="sm"
              variant="danger"
            >
              {label}
            </Button>
          ) : (
            <Button
              disabled={busy}
              key={nextStatus}
              onClick={() => onChange(order, nextStatus)}
              size="sm"
              variant="secondary"
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  ) : null;
}

function OrderReview({ orderId, review, onSubmitted, setNotice }) {
  const [rating, setRating] = useState("5");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const savedReview = await createReview({
        orderId,
        rating: Number(rating),
        text,
      });
      onSubmitted(savedReview);
      setNotice("Thank you. Your review has been submitted.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  if (review) {
    return (
      <section aria-label="Your review" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-950">Your review · {review.rating}/5</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{review.text}</p>
      </section>
    );
  }

  return (
    <form className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4" onSubmit={submit}>
      <h3 className="font-semibold text-stone-950">Review this completed order</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="text-sm font-medium text-stone-700">
          Rating
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
            onChange={(event) => setRating(event.target.value)}
            value={rating}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} / 5</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          Your review
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
            maxLength={1000}
            minLength={10}
            onChange={(event) => setText(event.target.value)}
            required
            value={text}
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-stone-500">Share 10–1000 characters. One review is allowed per order.</p>
      {error && <p className="mt-2 text-sm text-red-800" role="alert">{error}</p>}
      <Button className="mt-3" disabled={text.trim().length < 10} loading={saving} type="submit">
        Submit review
      </Button>
    </form>
  );
}

export function OrderManagement({ role }) {
  const canCreate = ["admin", "manager", "waiter"].includes(role);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [payingOrderId, setPayingOrderId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviews, setReviews] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const requestRefresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const live = useOrderRealtime(requestRefresh);
  const loadOrders = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listOrders({
        page,
        limit: pageSize,
        status: statusFilter || undefined,
        signal,
      });
      setOrders(response.data.orders);
      setMeta(response.meta);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, refreshKey, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders]);

  const completedOrderIds = role === "customer"
    ? orders.filter((order) => order.status === "completed").map((order) => order._id)
    : [];
  const completedOrderKey = completedOrderIds.join(",");

  useEffect(() => {
    if (role !== "customer" || !completedOrderKey) {
      setReviews({});
      setReviewError(null);
      setReviewLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setReviewLoading(true);
    setReviewError(null);
    listReviews({
      page: 1,
      limit: 100,
      orderIds: completedOrderKey.split(","),
      signal: controller.signal,
    })
      .then((response) => {
        setReviews(Object.fromEntries(
          response.data.reviews.map((review) => [review.orderId, review]),
        ));
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setReviewError(failure);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReviewLoading(false);
      });
    return () => controller.abort();
  }, [completedOrderKey, refreshKey, reviewRefreshKey, role]);

  async function transition(order, status) {
    setBusy(true);
    setNotice("");
    try {
      await changeOrderStatus(order._id, order.status, status);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setNotice(error.message);
      setRefreshKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancellation() {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    await transition(target, "cancelled");
  }

  async function payOrder(order) {
    setPayingOrderId(order._id);
    setNotice("");
    try {
      const checkoutUrl = await createCheckoutSession(order._id);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setNotice(error.message);
      setPayingOrderId("");
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
            <Button onClick={requestRefresh} variant="secondary">Refresh orders</Button>
          </div>
        }
        description={role === "customer"
          ? "Review your order history, follow live kitchen status, and pay securely with Stripe."
          : "Review orders and take actions allowed for your role."}
        eyebrow="Restaurant operations"
        title={role === "customer" ? "My orders" : "Order management"}
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="status">
          {notice}
        </p>
      )}
      {reviewError && (
        <ErrorState
          className="mb-5"
          error={reviewError}
          message="Your review history could not be loaded."
          onRetry={() => setReviewRefreshKey((key) => key + 1)}
        />
      )}

      {canCreate && (
        <OrderComposer
          onCreated={() => setRefreshKey((key) => key + 1)}
          role={role}
          setNotice={setNotice}
        />
      )}

      <Card className="mb-5 p-4">
        <label className="block max-w-xs text-sm font-medium text-stone-700">
          Filter by status
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            {["pending", "confirmed", "preparing", "ready", "completed", "cancelled"].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
      </Card>

      {loading ? (
        <LoadingState label="Loading orders..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="We couldn't load orders. Check your connection and try again."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          description={statusFilter ? "Try another status filter." : "New orders will appear here."}
          title="No orders found"
        />
      ) : (
        <section aria-label="Orders" className="space-y-4">
          {orders.map((order) => (
            <Card className="p-5 sm:p-6" key={order._id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold text-stone-950">
                    Order {order._id.slice(-6).toUpperCase()}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {order.lines?.length
                      ? order.lines.map((line) => `${line.nameSnapshot} × ${line.quantity}`).join(", ")
                      : "Legacy order details are unavailable"}
                  </p>
                  {order.table && (
                    <p className="mt-1 text-sm text-stone-600">Table assigned</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatus status={order.status} />
                  <PaymentStatus status={order.paymentStatus} />
                </div>
              </div>
              <details className="mt-4 rounded-xl border border-stone-200 px-4">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-orange-800 focus-visible:outline-2 focus-visible:outline-orange-700">
                  View order details
                </summary>
                <div className="border-t border-stone-100 py-3">
                  {order.lines?.length ? (
                    <ul className="space-y-2">
                      {order.lines.map((line, index) => (
                        <li
                          className="flex flex-col justify-between gap-1 text-sm sm:flex-row sm:gap-4"
                          key={`${line.menuItemId ?? line.nameSnapshot}-${index}`}
                        >
                          <span className="text-stone-700">
                            {line.nameSnapshot} × {line.quantity}
                          </span>
                          <span className="font-medium text-stone-800">
                            {formatMoney(line.lineTotalMinor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-600">Order line details are unavailable.</p>
                  )}
                  {order.billing && (
                    <dl className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-stone-600">Subtotal</dt>
                        <dd>{formatMoney(order.billing.subtotalMinor)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-stone-600">Tax</dt>
                        <dd>{formatMoney(order.billing.taxMinor)}</dd>
                      </div>
                      {order.billing.discountMinor > 0 && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-stone-600">Discount</dt>
                          <dd>−{formatMoney(order.billing.discountMinor)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 font-bold text-stone-950">
                        <dt>Total</dt>
                        <dd>{formatMoney(order.billing.totalMinor)}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </details>
              {role === "customer" && order.status === "completed" && (
                reviewLoading ? (
                  <LoadingState compact label="Loading your review..." />
                ) : (
                  <OrderReview
                    onSubmitted={(review) => setReviews((current) => ({
                      ...current,
                      [review.orderId]: review,
                    }))}
                    orderId={order._id}
                    review={reviews[order._id]}
                    setNotice={setNotice}
                  />
                )
              )}
              <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-stone-700">
                  {order.billing ? (
                    <p>
                      Subtotal {formatMoney(order.billing.subtotalMinor)} · Tax{" "}
                      {formatMoney(order.billing.taxMinor)} · Total{" "}
                      <strong>{formatMoney(order.billing.totalMinor)}</strong>
                    </p>
                  ) : (
                    <p>Billing details are unavailable for this legacy order.</p>
                  )}
                  <time className="mt-1 block text-xs text-stone-500" dateTime={order.createdAt}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date unavailable"}
                  </time>
                </div>
                <OrderActions
                  busy={busy}
                  onCancel={setCancelTarget}
                  onChange={transition}
                  order={order}
                  role={role}
                />
                {role === "customer" &&
                  (order.paymentStatus ?? "unpaid") === "unpaid" &&
                  order.status !== "cancelled" && (
                    <Button
                      disabled={Boolean(payingOrderId && payingOrderId !== order._id)}
                      loading={payingOrderId === order._id}
                      onClick={() => payOrder(order)}
                    >
                      Pay with Stripe
                    </Button>
                  )}
              </div>
            </Card>
          ))}
        </section>
      )}

      {!loading && !loadError && meta.totalPages > 1 && (
        <nav aria-label="Order pages" className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="secondary">Previous</Button>
            <Button disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        confirmLabel="Cancel order"
        description={cancelTarget
          ? `Cancel order ${cancelTarget._id.slice(-6).toUpperCase()}? This cannot be undone.`
          : ""}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancellation}
        open={Boolean(cancelTarget)}
        title="Cancel this order?"
      />
    </>
  );
}
