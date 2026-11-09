import { apiGet, apiRequest } from "@/lib/api";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export async function createCheckoutSession(orderId) {
  if (!stripePublishableKey?.startsWith("pk_test_")) {
    throw new Error("Set a Stripe test publishable key in the client .env.local file.");
  }
  const response = await apiRequest("/payments/checkout", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
  const checkoutUrl = response?.data?.checkoutUrl;
  if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://checkout.stripe.com/")) {
    throw new Error("The Restora server returned an invalid Stripe Checkout URL");
  }
  return checkoutUrl;
}

export async function getPayment(id, { signal } = {}) {
  const response = await apiGet(`/payments/${encodeURIComponent(id)}`, { signal });
  if (!response?.data?.payment || typeof response.data.payment._id !== "string") {
    throw new Error("The Restora server returned an invalid payment");
  }
  return response.data.payment;
}

export async function listPayments({ page = 1, limit = 20, orderId, signal } = {}) {
  const response = await apiGet("/payments", {
    query: { page, limit, orderId },
    signal,
  });
  if (
    !Array.isArray(response?.data?.payments) ||
    !Number.isInteger(response?.meta?.page) ||
    !Number.isInteger(response?.meta?.limit) ||
    !Number.isInteger(response?.meta?.total) ||
    !Number.isInteger(response?.meta?.totalPages)
  ) {
    throw new Error("The Restora server returned an invalid payment list");
  }
  return response;
}

export async function cancelPayment(id) {
  return apiRequest(`/payments/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export async function refundPayment(id) {
  return apiRequest(`/payments/${encodeURIComponent(id)}/refund`, { method: "POST" });
}
