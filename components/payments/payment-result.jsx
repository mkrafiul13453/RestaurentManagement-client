"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/feedback";
import { cancelPayment, getPayment } from "@/lib/payments-api";
import { formatMoney } from "@/lib/money";

export function PaymentResult({ mode }) {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPayment = useCallback(async (signal) => {
    if (!paymentId) {
      setError("Payment reference is missing. Return to your orders and check payment history.");
      return;
    }
    try {
      setPayment(await getPayment(paymentId, { signal }));
      setError("");
    } catch (failure) {
      if (failure.name !== "AbortError") setError(failure.message);
    }
  }, [paymentId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPayment(controller.signal);
    return () => controller.abort();
  }, [loadPayment]);

  useEffect(() => {
    if (mode !== "success" || payment?.status !== "pending") return undefined;
    const timer = window.setTimeout(() => {
      void loadPayment();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [loadPayment, mode, payment?.status]);

  async function cancelCheckout() {
    if (!paymentId) return;
    setBusy(true);
    setError("");
    try {
      await cancelPayment(paymentId);
      await loadPayment();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!payment && !error) return <LoadingState label="Checking payment with Restora..." />;

  const isPaid = payment?.status === "paid";
  const isRefunded = payment?.status === "refunded";
  const isFailed = ["failed", "cancelled"].includes(payment?.status);
  const title = isPaid
    ? "Payment successful"
    : isRefunded
      ? "Payment refunded"
      : isFailed
        ? "Payment not completed"
        : mode === "cancel"
          ? "Checkout not completed"
          : "Confirming your payment";
  const message = isPaid
    ? "Stripe has confirmed your payment."
    : isRefunded
      ? "Stripe has confirmed the refund."
      : isFailed
        ? "No payment was completed. You can try checkout again from your orders."
        : mode === "cancel"
          ? "Your payment is still pending. Cancel the Checkout session below or return to your orders."
          : "Payment is still processing. This page will update after Stripe confirms it.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-5 py-12">
      <Card className="w-full max-w-xl p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Stripe Checkout</p>
        <h1 className="mt-3 text-2xl font-bold text-stone-950">{title}</h1>
        {payment && (
          <p className="mt-2 text-sm text-stone-600">
            Order {payment.orderId.slice(-6).toUpperCase()} · {formatMoney(payment.amountMinor)}
          </p>
        )}
        <p className="mt-3 text-sm leading-6 text-stone-700">{error || message}</p>
        {payment?.status === "pending" && mode === "cancel" && (
          <Button className="mt-5" loading={busy} onClick={cancelCheckout} variant="secondary">
            Cancel checkout
          </Button>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-10 items-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            href="/customer/orders"
          >
            {isFailed ? "Retry from my orders" : "Return to my orders"}
          </Link>
          {payment?.status === "pending" && (
            <Button onClick={() => void loadPayment()} variant="secondary">Refresh status</Button>
          )}
        </div>
      </Card>
    </main>
  );
}
