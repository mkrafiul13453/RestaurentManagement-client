import { apiGet, apiRequest } from "./api.js";

function isReview(review) {
  return review &&
    typeof review.id === "string" &&
    typeof review.orderId === "string" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.text === "string" &&
    typeof review.createdAt === "string" &&
    Object.keys(review).every((key) =>
      ["id", "orderId", "rating", "text", "createdAt", "updatedAt"].includes(key),
    );
}

export async function listReviews({ page = 1, limit = 20, orderIds, signal } = {}) {
  const response = await apiGet("/reviews", {
    query: {
      page,
      limit,
      orderIds: orderIds?.length ? orderIds.join(",") : undefined,
    },
    signal,
  });
  const meta = response?.meta;
  if (
    !Array.isArray(response?.data?.reviews) ||
    !response.data.reviews.every(isReview) ||
    !Number.isInteger(meta?.page) ||
    !Number.isInteger(meta?.limit) ||
    !Number.isInteger(meta?.total) ||
    !Number.isInteger(meta?.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid review list");
  }
  return response;
}

export async function createReview({ orderId, rating, text }) {
  const response = await apiRequest("/reviews", {
    method: "POST",
    body: JSON.stringify({ orderId, rating, text }),
  });
  if (!isReview(response?.data?.review) || response.data.review.orderId !== orderId) {
    throw new Error("The Restora server returned an invalid review");
  }
  return response.data.review;
}
