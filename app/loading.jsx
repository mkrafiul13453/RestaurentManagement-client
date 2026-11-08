export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-6 text-stone-700">
      <p role="status" className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
        Loading Restora...
      </p>
    </main>
  );
}
