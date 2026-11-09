import { apiGet } from "./api.js";

const paymentStatuses = ["pending", "paid", "failed", "cancelled", "refunded"];

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isReport(report) {
  return report &&
    ["daily", "weekly", "monthly", "custom"].includes(report.period) &&
    typeof report.timeZone === "string" &&
    report.range &&
    typeof report.range.from === "string" &&
    typeof report.range.to === "string" &&
    typeof report.range.start === "string" &&
    typeof report.range.endExclusive === "string" &&
    report.summary &&
    [
      "totalRevenueMinor",
      "totalOrders",
      "completedOrders",
      "cancelledOrders",
      "averageOrderValueMinor",
      "grossPaidMinor",
      "refundedMinor",
    ].every((key) => isNonNegativeInteger(report.summary[key])) &&
    report.payments &&
    paymentStatuses.every((status) =>
      report.payments[status] &&
      isNonNegativeInteger(report.payments[status].count) &&
      isNonNegativeInteger(report.payments[status].amountMinor),
    ) &&
    Array.isArray(report.trends) &&
    report.trends.every((row) =>
      typeof row.date === "string" &&
      isNonNegativeInteger(row.orderCount) &&
      isNonNegativeInteger(row.completedOrders) &&
      isNonNegativeInteger(row.cancelledOrders) &&
      Number.isSafeInteger(row.revenueMinor),
    ) &&
    report.policies &&
    typeof report.policies.revenue === "string" &&
    typeof report.policies.averageOrderValue === "string" &&
    typeof report.policies.orders === "string";
}

export async function getAnalytics({
  period = "daily",
  date,
  from,
  to,
  timeZone = "UTC",
  signal,
} = {}) {
  const response = await apiGet("/analytics", {
    query: { period, date, from, to, timeZone },
    signal,
  });
  if (!isReport(response?.data)) {
    throw new Error("The Restora server returned an invalid analytics report");
  }
  return response.data;
}
