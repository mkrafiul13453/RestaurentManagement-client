"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { getAnalytics } from "@/lib/analytics-api";
import { formatMoney } from "@/lib/money";

function localToday(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function SummaryCard({ label, value, detail }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm font-medium text-stone-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-stone-500">{detail}</p>}
    </Card>
  );
}

function TrendChart({ trends }) {
  const maxRevenue = Math.max(1, ...trends.map((day) => day.revenueMinor));
  const columns = useMemo(() => [
    { key: "date", header: "Date" },
    { key: "orderCount", header: "Orders" },
    { key: "completedOrders", header: "Completed" },
    { key: "cancelledOrders", header: "Cancelled" },
    { key: "revenueMinor", header: "Net revenue", render: (value) => formatMoney(value) },
  ], []);

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-lg font-bold text-stone-950">Daily sales trend</h2>
      <p className="mt-1 text-sm text-stone-600">Net collected revenue by local calendar day.</p>
      <div aria-label="Daily net revenue bar chart" className="mt-5 flex min-h-44 items-end gap-1 overflow-x-auto border-b border-l border-stone-300 px-2 pb-1 sm:gap-2">
        {trends.map((day) => {
          const height = Math.max(day.revenueMinor > 0 ? 8 : 2, (day.revenueMinor / maxRevenue) * 100);
          return (
            <div className="flex h-40 min-w-8 flex-1 flex-col items-center justify-end gap-1" key={day.date}>
              <span className="sr-only">{day.date}: {formatMoney(day.revenueMinor)}</span>
              <div
                aria-hidden="true"
                className="w-full max-w-10 rounded-t bg-orange-600"
                style={{ height: `${height}%` }}
                title={`${day.date}: ${formatMoney(day.revenueMinor)}`}
              />
              <span className="max-w-12 truncate text-[10px] text-stone-500">
                {day.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <DataTable
        caption="Accessible daily order and revenue data represented by the trend chart"
        className="mt-4"
        columns={columns}
        emptyDescription="No daily data in this range."
        rows={trends}
      />
    </Card>
  );
}

export function SalesReport({ role }) {
  const [period, setPeriod] = useState("daily");
  const [selectedDate, setSelectedDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setTimeZone(detectedTimeZone);
    setSelectedDate(localToday(detectedTimeZone));
  }, []);

  const loadReport = useCallback(async (signal) => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalytics({
        period,
        ...(period === "custom" ? { from, to } : { date: selectedDate }),
        timeZone,
        signal,
      });
      setReport(result);
    } catch (failure) {
      if (failure.name !== "AbortError") setError(failure);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [from, period, refreshKey, selectedDate, timeZone, to]);

  useEffect(() => {
    const controller = new AbortController();
    void loadReport(controller.signal);
    return () => controller.abort();
  }, [loadReport]);

  function applyFilters(event) {
    event.preventDefault();
    setValidationMessage("");
    if (period === "custom" && (!from || !to || from > to)) {
      setValidationMessage("Choose a valid start and end date; the start must not be after the end.");
      return;
    }
    setRefreshKey((key) => key + 1);
  }

  const paymentRows = report
    ? Object.entries(report.payments).map(([status, values]) => ({
      status,
      count: values.count,
      amountMinor: values.amountMinor,
    }))
    : [];
  const paymentColumns = useMemo(() => [
    { key: "status", header: "Payment status", render: (value) => <span className="capitalize">{value}</span> },
    { key: "count", header: "Payments" },
    { key: "amountMinor", header: "Amount", render: (value) => formatMoney(value) },
  ], []);
  const hasActivity = Boolean(report && (
    report.summary.totalOrders > 0 ||
    paymentRows.some((payment) => payment.count > 0)
  ));

  return (
    <>
      <PageHeader
        actions={<Button onClick={() => setRefreshKey((key) => key + 1)} variant="secondary">Refresh</Button>}
        description="Server-calculated sales and payment summaries. Revenue is captured payments less fully refunded payments; pending, failed, and cancelled payments are excluded."
        eyebrow="Business reporting"
        title="Sales analytics"
      />

      <Card className="mb-6 p-4 sm:p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={applyFilters}>
          <label className="text-sm font-medium text-stone-700">
            Date range
            <select
              className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
              onChange={(event) => {
                setPeriod(event.target.value);
                setValidationMessage("");
              }}
              value={period}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {period === "custom" ? (
            <>
              <label className="text-sm font-medium text-stone-700">
                From
                <input
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
                  onChange={(event) => setFrom(event.target.value)}
                  required
                  type="date"
                  value={from}
                />
              </label>
              <label className="text-sm font-medium text-stone-700">
                To
                <input
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
                  onChange={(event) => setTo(event.target.value)}
                  required
                  type="date"
                  value={to}
                />
              </label>
            </>
          ) : (
            <label className="text-sm font-medium text-stone-700">
              Date
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
                onChange={(event) => setSelectedDate(event.target.value)}
                required
                type="date"
                value={selectedDate}
              />
            </label>
          )}
          <div className="flex items-end">
            <Button className="w-full" type="submit">Apply filters</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-stone-500">
          All calendar boundaries use {timeZone || "your local timezone"}; custom ranges include both dates and are limited to 366 days.
        </p>
        {validationMessage && <p className="mt-2 text-sm text-red-800" role="alert">{validationMessage}</p>}
      </Card>

      {loading ? (
        <LoadingState label="Calculating sales analytics..." />
      ) : error ? (
        <ErrorState
          error={error}
          message="We couldn't load the analytics report. Check your connection and try again."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : report ? (
        <>
          <p className="mb-4 text-sm text-stone-600">
            {report.range.from} – {report.range.to} · {report.timeZone}
          </p>
          <section aria-label="Sales summary" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard detail="Paid less refunded payments" label="Net revenue" value={formatMoney(report.summary.totalRevenueMinor)} />
            <SummaryCard label="Total orders" value={report.summary.totalOrders.toLocaleString()} />
            <SummaryCard label="Completed orders" value={report.summary.completedOrders.toLocaleString()} />
            <SummaryCard label="Cancelled orders" value={report.summary.cancelledOrders.toLocaleString()} />
            <SummaryCard detail="Completed order totals ÷ completed orders" label="Average order value" value={formatMoney(report.summary.averageOrderValueMinor)} />
            <SummaryCard detail={`${formatMoney(report.summary.refundedMinor)} refunded`} label="Gross captured" value={formatMoney(report.summary.grossPaidMinor)} />
          </section>

          {!hasActivity && (
            <EmptyState
              className="mb-6"
              description="No orders or payments were recorded in the selected range. Summary values are zero."
              title="No activity in this range"
            />
          )}

          <div className="grid gap-5">
            <TrendChart trends={report.trends} />
            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-stone-950">Payment summary</h2>
              <DataTable
                caption="Payment counts and amounts by current payment status"
                columns={paymentColumns}
                emptyDescription="There are no payments in this range."
                rows={paymentRows}
              />
            </Card>
          </div>
          <details className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-stone-800">How these figures are calculated</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>{report.policies.revenue}</li>
              <li>{report.policies.averageOrderValue}</li>
              <li>{report.policies.orders}</li>
            </ul>
          </details>
        </>
      ) : null}
    </>
  );
}
