"use client";

import { ErrorState } from "@/components/ui/feedback";

export default function ErrorPage({ reset }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-6">
      <div className="w-full max-w-lg">
        <ErrorState
          message="Restora couldn't load this page. Please try again."
          onRetry={reset}
        />
      </div>
    </main>
  );
}
