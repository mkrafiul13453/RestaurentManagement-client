import Link from "next/link";
import { useId } from "react";
import { Button } from "./button";
import { Card } from "./card";

export function LoadingState({
  label = "Loading",
  className = "",
  compact = false,
}) {
  return (
    <div
      aria-live="polite"
      className={`flex items-center gap-3 text-sm text-stone-600 ${compact ? "py-5" : "min-h-48 justify-center"} ${className}`}
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-orange-600 border-r-transparent"
      />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
  className = "",
}) {
  return (
    <Card className={`px-6 py-10 text-center ${className}`}>
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function getSafeDisplayMessage(message, fallback = "Please try again.") {
  return (
    typeof message === "string" &&
    message.length > 0 &&
    message.length <= 180 &&
    !/(\bat\s+\S+\s+\(|https?:\/\/|mongodb(\+srv)?:|stack|exception:)/i.test(message)
  )
    ? message
    : fallback;
}

export function ErrorState({
  error,
  message,
  onRetry,
  className = "",
}) {
  const titleId = useId();
  const candidate = message ?? (error instanceof Error ? error.message : "");
  const safeMessage = getSafeDisplayMessage(
    candidate,
    "We couldn't load this content. Please try again.",
  );

  return (
    <Card
      aria-labelledby={titleId}
      className={`border-red-200 bg-red-50/70 px-6 py-7 ${className}`}
      role="alert"
    >
      <h2 className="font-semibold text-red-950" id={titleId}>
        Something went wrong
      </h2>
      <p className="mt-2 text-sm leading-6 text-red-900">{safeMessage}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </Card>
  );
}

export function ForbiddenState({
  message = "You don't have access to this page.",
  homeHref = "/",
}) {
  return (
    <Card className="mx-auto max-w-xl px-6 py-10 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
        Access restricted
      </p>
      <h1 className="mt-3 text-2xl font-bold text-stone-950">Not authorized</h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">{message}</p>
      <Link
        className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
        href={homeHref}
      >
        Return home
      </Link>
    </Card>
  );
}
