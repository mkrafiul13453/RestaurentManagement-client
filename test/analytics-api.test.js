import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
const { getAnalytics } = await import("../lib/analytics-api.js");

const report = {
  period: "daily",
  timeZone: "UTC",
  range: {
    from: "2026-03-08",
    to: "2026-03-08",
    start: "2026-03-08T00:00:00.000Z",
    endExclusive: "2026-03-09T00:00:00.000Z",
  },
  summary: {
    totalRevenueMinor: 3500,
    totalOrders: 4,
    completedOrders: 2,
    cancelledOrders: 1,
    averageOrderValueMinor: 2500,
    grossPaidMinor: 4500,
    refundedMinor: 1000,
  },
  payments: Object.fromEntries(
    ["pending", "paid", "failed", "cancelled", "refunded"].map((status) => [
      status,
      { count: 0, amountMinor: 0 },
    ]),
  ),
  trends: [{
    date: "2026-03-08",
    orderCount: 4,
    completedOrders: 2,
    cancelledOrders: 1,
    revenueMinor: 3500,
  }],
  policies: {
    revenue: "Paid less refunds.",
    averageOrderValue: "Completed order totals divided by completed order count.",
    orders: "Orders counted by creation time.",
  },
};

test("analytics API sends date/timezone filters and returns server-calculated metrics", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return Response.json({ success: true, data: report, message: "Report loaded" });
  };

  try {
    const result = await getAnalytics({
      period: "custom",
      from: "2026-03-01",
      to: "2026-03-31",
      timeZone: "America/New_York",
    });
    assert.equal(result.summary.totalRevenueMinor, 3500);
    assert.equal(requestedUrl.searchParams.get("period"), "custom");
    assert.equal(requestedUrl.searchParams.get("from"), "2026-03-01");
    assert.equal(requestedUrl.searchParams.get("to"), "2026-03-31");
    assert.equal(requestedUrl.searchParams.get("timeZone"), "America/New_York");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("analytics API rejects invalid report shapes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    data: { ...report, summary: { ...report.summary, totalRevenueMinor: -1 } },
  });
  try {
    await assert.rejects(getAnalytics({ period: "daily" }), /invalid analytics report/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
