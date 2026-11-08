import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-6 py-16 text-[#25170f]">
      <section className="w-full max-w-3xl rounded-3xl border border-orange-100 bg-white p-8 shadow-xl shadow-orange-950/5 sm:p-14">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-700">
          Restaurant management, made simple
        </p>
        <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-7xl">
          Restora<span className="text-orange-600">.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
          A clearer way to bring your restaurant&apos;s team and daily operations
          together.
        </p>
        <Link
          className="mt-9 inline-flex items-center gap-3 rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
          href="/login"
        >
          Sign in or create an account
        </Link>
      </section>
    </main>
  );
}
