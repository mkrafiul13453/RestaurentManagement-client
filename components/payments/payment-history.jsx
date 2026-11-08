"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { cancelPayment, listPayments, refundPayment } from "@/lib/payments-api";
import { formatMoney } from "@/lib/money";

function PaymentStatus({ status }) {
  const styles = {
    pending: "bg-amber-100 text-amber-900",
    paid: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-stone-200 text-stone-700",
    refunded: "bg-sky-100 text-sky-800",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export function PaymentHistory({ role, compact = false }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busyPaymentId, setBusyPaymentId] = useState("");
  const [refundTarget, setRefundTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const canRefund = ["admin", "manager", "cashier"].includes(role);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listPayments({ limit: 50, signal });
      setPayments(response.data.payments);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function act(payment, action) {
    setBusyPaymentId(payment._id);
    setNotice("");
    try {
      if (action === "refund") {
        await refundPayment(payment._id);
        setNotice("Refund requested. The payment will show as refunded after Stripe confirms it.");
      } else {
        await cancelPayment(payment._id);
        setNotice("Cancellation requested. Stripe will confirm the final payment status.");
      }
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyPaymentId("");
    }
  }

  return (
    <section className={compact ? "mt-8" : ""}>
      {!compact && (
        <PageHeader
          description="Review Stripe payment attempts. Refunds and cancellations are finalized by verified Stripe webhooks."
          eyebrow="Billing"
          title="Payments"
        />
      )}
      {notice && (
        <p className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <LoadingState label="Loading payments..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="Payment history could not be loaded."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          description="Payments will appear here after a customer starts Stripe Checkout."
          title="No payment history yet"
        />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={payment._id}>
              <div>
                <p className="font-semibold text-stone-950">
                  Order {payment.orderId.slice(-6).toUpperCase()} · {formatMoney(payment.amountMinor)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "Date unavailable"}
                  {role !== "customer" && ` · Customer ${payment.userId}`}
                </p>
                {role === "customer" && (
                  <Link className="mt-1 inline-block text-xs font-semibold text-orange-700 underline" href="/customer/orders">
                    View orders / retry
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PaymentStatus status={payment.status} />
                {payment.status === "pending" && (
                  <Button
                    loading={busyPaymentId === payment._id}
                    onClick={() => act(payment, "cancel")}
                    size="sm"
                    variant="secondary"
                  >
                    Cancel checkout
                  </Button>
                )}
                {canRefund && payment.status === "paid" && (
                  <Button
                    onClick={() => setRefundTarget(payment)}
                    size="sm"
                    variant="danger"
                  >
                    Full refund
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        busy={busyPaymentId === refundTarget?._id}
        confirmLabel="Request full refund"
        description={refundTarget
          ? `Refund ${formatMoney(refundTarget.amountMinor)} for order ${refundTarget.orderId.slice(-6).toUpperCase()}? This action cannot be undone.`
          : ""}
        onClose={() => setRefundTarget(null)}
        onConfirm={async () => {
          const target = refundTarget;
          if (!target) return;
          setRefundTarget(null);
          await act(target, "refund");
        }}
        open={Boolean(refundTarget)}
        title="Refund this payment?"
      />
    </section>
  );
}
