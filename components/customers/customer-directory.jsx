"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { listCustomers } from "@/lib/customers-api";

const PAGE_SIZE = 20;

export function CustomerDirectory({ role }) {
  const [emailFilter, setEmailFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listCustomers({
      page,
      limit: PAGE_SIZE,
      search: appliedFilter,
      signal: controller.signal,
    })
      .then(setResult)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [appliedFilter, page, retryCount]);

  function applyEmailFilter(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilter(emailFilter.trim());
  }

  const customers = result?.data?.customers ?? [];
  const meta = result?.meta;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <>
      <PageHeader
        description="Read-only customer email directory. Search filters only the customer account email; authentication credentials and account metadata are never returned."
        eyebrow={`${role === "admin" ? "Administrator" : "Manager"} workspace`}
        title="Customer directory"
      />

      <form
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-end"
        onSubmit={applyEmailFilter}
      >
        <label className="min-w-0 flex-1 text-sm font-semibold text-stone-800">
          Filter by email
          <input
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-xl border border-stone-300 px-3 text-sm font-normal outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
            maxLength={100}
            onChange={(event) => setEmailFilter(event.target.value)}
            placeholder="Search customer email"
            type="search"
            value={emailFilter}
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit">Apply filter</Button>
          {appliedFilter && (
            <Button
              onClick={() => {
                setEmailFilter("");
                setAppliedFilter("");
                setPage(1);
              }}
              variant="secondary"
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {error ? (
        <ErrorState
          error={error}
          message={error.message}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      ) : isLoading ? (
        <LoadingState label="Loading customers..." />
      ) : (
        <>
          <div className="mb-3 text-sm text-stone-600" aria-live="polite">
            {meta?.total ?? 0} customers
            {appliedFilter ? ` matching “${appliedFilter}”` : ""}
          </div>
          <DataTable
            caption="Customer email addresses"
            columns={[{ key: "email", header: "Email address" }]}
            emptyDescription={
              appliedFilter
                ? "Try another email filter."
                : "Customer accounts will appear here when available."
            }
            emptyTitle={appliedFilter ? "No matching customers" : "No customers yet"}
            getRowKey={(customer) => customer.email}
            rows={customers}
          />
          <nav
            aria-label="Customer directory pages"
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-stone-600">
              {totalPages > 0 ? `Page ${page} of ${totalPages}` : "No pages"}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={isLoading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={isLoading || totalPages === 0 || page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
