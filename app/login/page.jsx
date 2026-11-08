"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getSafePostAuthPath, normalizeRole } from "@/lib/roles";
import { getSafeDisplayMessage } from "@/components/ui/feedback";

export default function LoginPage() {
  const [mode, setMode] = useState("sign-in");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              name: String(formData.get("name") ?? ""),
              email,
              password,
            });

      if (result.error) {
        setErrorMessage(
          getSafeDisplayMessage(
            result.error.message,
            "Authentication failed. Please try again.",
          ),
        );
        return;
      }

      const sessionResult = await authClient.getSession();
      if (sessionResult.error) {
        setErrorMessage(
          getSafeDisplayMessage(
            sessionResult.error.message,
            "We couldn't verify your account role. Please try signing in again.",
          ),
        );
        return;
      }

      const role = normalizeRole(
        sessionResult.data?.user?.role ?? result.data?.user?.role,
      ) || "customer";
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      window.location.assign(getSafePostAuthPath(requestedPath, role));
    } catch (error) {
      setErrorMessage(
        getSafeDisplayMessage(
          error instanceof Error ? error.message : "",
          "Authentication failed. Please try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignUp = mode === "sign-up";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-5 py-12 text-[#25170f]">
      <section className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-7 shadow-xl shadow-orange-950/5 sm:p-9">
        <Link className="text-sm font-bold text-orange-700" href="/">
          ← Restora home
        </Link>
        <h1 className="mt-7 text-3xl font-bold">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {isSignUp
            ? "New accounts start with customer access."
            : "Sign in to continue to Restora."}
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="block text-sm font-medium text-stone-800">
              Name
              <input
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
                maxLength={100}
                name="name"
                required
              />
            </label>
          )}
          <label className="block text-sm font-medium text-stone-800">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block text-sm font-medium text-stone-800">
            Password
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            className="w-full rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          {isSignUp ? "Already have an account?" : "New to Restora?"}{" "}
          <button
            className="font-semibold text-orange-700 underline-offset-4 hover:underline"
            onClick={() => {
              setErrorMessage("");
              setMode(isSignUp ? "sign-in" : "sign-up");
            }}
            type="button"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}
