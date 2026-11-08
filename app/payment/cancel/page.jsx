import { Suspense } from "react";
import { LoadingState } from "@/components/ui/feedback";
import { PaymentResult } from "@/components/payments/payment-result";

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<LoadingState label="Checking payment..." />}>
      <PaymentResult mode="cancel" />
    </Suspense>
  );
}
