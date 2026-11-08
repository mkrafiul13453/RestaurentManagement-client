"use client";

import { ErrorState } from "@/components/ui/feedback";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fffaf4]">
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">
            <ErrorState
              message="Restora couldn't start this page. Please try again."
              onRetry={reset}
            />
          </div>
        </main>
      </body>
    </html>
  );
}
