import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-6">
      <section className="max-w-lg rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl shadow-orange-950/5">
        <p className="font-bold uppercase tracking-[0.2em] text-orange-700">
          404
        </p>
        <h1 className="mt-3 text-2xl font-bold text-stone-900">
          Page not found
        </h1>
        <Link
          className="mt-6 inline-flex rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
          href="/"
        >
          Back to Restora
        </Link>
      </section>
    </main>
  );
}
