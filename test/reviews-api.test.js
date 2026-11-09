import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
const { createReview, listReviews } = await import("../lib/reviews-api.js");

const review = {
  id: "review-1",
  orderId: "order-1",
  rating: 5,
  text: "Excellent food and service.",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("review API builds paginated customer review queries and validates safe data", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return Response.json({
      success: true,
      data: { reviews: [review] },
      meta: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
  };

  try {
    const response = await listReviews({
      page: 2,
      limit: 10,
      orderIds: ["order-1", "order-2"],
    });
    assert.deepEqual(response.data.reviews, [review]);
    assert.equal(requestedUrl.searchParams.get("page"), "2");
    assert.equal(requestedUrl.searchParams.get("limit"), "10");
    assert.equal(requestedUrl.searchParams.get("orderIds"), "order-1,order-2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("review API rejects private or malformed records", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    data: { reviews: [{ ...review, userId: "another-user" }] },
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });

  try {
    await assert.rejects(listReviews(), /invalid review list/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("review creation uses the narrow endpoint and validates the response", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = new URL(url);
    requestOptions = options;
    return Response.json({ success: true, data: { review }, message: "Review submitted" });
  };

  try {
    const saved = await createReview({
      orderId: "order-1",
      rating: 5,
      text: review.text,
    });
    assert.equal(saved.id, review.id);
    assert.equal(requestUrl.pathname, "/api/v1/reviews");
    assert.equal(requestOptions.method, "POST");
    assert.deepEqual(JSON.parse(requestOptions.body), {
      orderId: "order-1",
      rating: 5,
      text: review.text,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
