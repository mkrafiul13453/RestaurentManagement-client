"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney } from "@/lib/money";
import { listOrders } from "@/lib/orders-api";
import { listPayments } from "@/lib/payments-api";
import { listReservations } from "@/lib/reservations-api";
import { listMenuItemsPage } from "@/lib/catalog-api";

const recentLimit = 5;

function formatActivityDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date unavailable";
}

function statusStyle(status) {
  if (["paid", "confirmed", "completed"].includes(status)) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (["cancelled", "failed", "refunded"].includes(status)) {
    return "bg-stone-100 text-stone-700";
  }
  return "bg-amber-100 text-amber-900";
}

export function CustomerDashboard() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [orders, reservations, payments, menu] = await Promise.all([
          listOrders({ page: 1, limit: recentLimit, signal: controller.signal }),
          listReservations({ page: 1, limit: recentLimit, signal: controller.signal }),
          listPayments({ page: 1, limit: recentLimit, signal: controller.signal }),
          listMenuItemsPage({ page: 1, limit: 1, signal: controller.signal }),
        ]);
        setSnapshot({
          orders,
          reservations,
          payments,
          menuTotal: menu.meta.total,
        });
      } catch (failure) {
        if (failure.name !== "AbortError") setError(failure);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const activities = snapshot
    ? [
      ...snapshot.orders.data.orders.map((order) => ({
        id: `order-${order._id}`,
        kind: "Order",
        label: `Order ${order._id.slice(-6).toUpperCase()}`,
        status: order.status,
        date: order.createdAt,
        href: "/customer/orders",
      })),
      ...snapshot.reservations.data.reservations.map((reservation) => ({
        id: `reservation-${reservation._id}`,
        kind: "Reservation",
        label: reservation.table?.label
          ? `${reservation.table.label} reservation`
          : "Table reservation",
        status: reservation.status,
        date: reservation.createdAt,
        href: "/customer/reservations",
      })),
      ...snapshot.payments.data.payments.map((payment) => ({
        id: `payment-${payment._id}`,
        kind: "Payment",
        label: `Order ${payment.orderId.slice(-6).toUpperCase()} · ${formatMoney(payment.amountMinor)}`,
        status: payment.status,
        date: payment.createdAt,
        href: "/customer/payments",
      })),
    ]
      .sort((left, right) => new Date(right.date ?? 0) - new Date(left.date ?? 0))
      .slice(0, 6)
    : [];

  return (
    <>
      <PageHeader
        actions={
          <button
            className="min-h-10 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-orange-700"
            onClick={reload}
            type="button"
          >
            Refresh overview
          </button>
        }
        description="Browse today's menu, keep up with your orders, and manage your table reservations."
        eyebrow="Your Restora"
        title="Welcome back"
      />

      <section aria-label="Customer overview">
        {loading ? (
          <LoadingState label="Loading your dashboard..." />
        ) : error ? (
          <ErrorState
            error={error}
            message="Your overview could not be loaded. Check your connection and try again."
            onRetry={reload}
          />
        ) : snapshot ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Available menu items",
                value: snapshot.menuTotal,
                href: "/customer/menu",
              },
              {
                label: "Your orders",
                value: snapshot.orders.meta.total,
                href: "/customer/orders",
              },
              {
                label: "Your reservations",
                value: snapshot.reservations.meta.total,
                href: "/customer/reservations",
              },
              {
                label: "Payment records",
                value: snapshot.payments.meta.total,
                href: "/customer/payments",
              },
            ].map((item) => (
              <Link
                className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
                href={item.href}
                key={item.label}
              >
                <Card className="h-full p-5 transition-colors hover:border-orange-300 hover:bg-orange-50/40">
                  <p className="text-sm font-medium text-stone-600">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-stone-950">
                    {item.value}
                  </p>
                  <span className="mt-3 inline-block text-sm font-semibold text-orange-700">
                    View details <span aria-hidden="true">→</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-stone-950">Recent activity</h2>
            <Link
              className="text-sm font-semibold text-orange-700 underline decoration-orange-300 underline-offset-4"
              href="/customer/orders"
            >
              View orders
            </Link>
          </div>
          {loading ? (
            <LoadingState compact label="Loading recent activity..." />
          ) : error ? (
            <Card className="p-5">
              <p className="text-sm text-stone-600">Recent activity is unavailable.</p>
            </Card>
          ) : activities.length === 0 ? (
            <EmptyState
              description="Your orders, reservations, and payments will appear here."
              title="No activity yet"
            />
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Link
                  className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
                  href={activity.href}
                  key={activity.id}
                >
                  <Card className="flex flex-col gap-3 p-4 transition-colors hover:border-orange-300 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {activity.kind}
                      </p>
                      <p className="mt-1 font-semibold text-stone-900">{activity.label}</p>
                      <time
                        className="mt-1 block text-xs text-stone-500"
                        dateTime={activity.date}
                      >
                        {formatActivityDate(activity.date)}
                      </time>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(activity.status)}`}>
                      {activity.status}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside aria-labelledby="customer-shortcuts-title">
          <h2 className="mb-4 text-lg font-bold text-stone-950" id="customer-shortcuts-title">
            Quick links
          </h2>
          <div className="space-y-3">
            {[
              ["Explore the menu", "Find something delicious.", "/customer/menu"],
              ["Book a table", "Reserve a table for your visit.", "/customer/reservations"],
              ["Track an order", "See the latest order status.", "/customer/orders"],
              ["Payment history", "Review your Stripe payments.", "/customer/payments"],
            ].map(([label, description, href]) => (
              <Link
                className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
                href={href}
                key={href}
              >
                <Card className="p-4 transition-colors hover:border-orange-300 hover:bg-orange-50/40">
                  <p className="font-semibold text-stone-900">{label}</p>
                  <p className="mt-1 text-sm text-stone-600">{description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
