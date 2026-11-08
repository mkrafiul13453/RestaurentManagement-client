"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  getRoleFromPath,
  getRoleHome,
  isRole,
  normalizeRole,
  roleConfig,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/feedback";

function getDisplayName(user) {
  return user?.name?.trim() || user?.email || "Restora team member";
}

function getBreadcrumb(pathname, role) {
  const name = roleConfig[role]?.label ?? "Workspace";
  const segment = pathname.split("/").filter(Boolean).at(-1);
  return segment && segment !== role ? `${name} / ${segment}` : name;
}

export function WorkspaceShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signOutError, setSignOutError] = useState(null);
  const mobileNavRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const wasMobileNavOpen = useRef(false);
  const expectedRole = getRoleFromPath(pathname);
  const user = session?.user;
  const currentRole = normalizeRole(user?.role) || "customer";

  useEffect(() => {
    if (!isPending && !user && !error) {
      const returnTo = encodeURIComponent(pathname);
      router.replace(`/login?next=${returnTo}`);
    }
  }, [error, isPending, pathname, router, user]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      mobileNavRef.current?.querySelector("a")?.focus();
    } else if (wasMobileNavOpen.current) {
      mobileToggleRef.current?.focus();
    }

    wasMobileNavOpen.current = mobileNavOpen;
  }, [mobileNavOpen]);

  function handleMobileNavKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileNavOpen(false);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = mobileNavRef.current?.querySelectorAll(
      'a[href], button:not(:disabled)',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSignOut() {
    setSignOutError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutError(result.error);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch (signOutFailure) {
      setSignOutError(signOutFailure);
    }
  }

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-5">
        <LoadingState label="Checking your Restora session..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-5 py-12">
        <div className="w-full max-w-xl">
          <ErrorState
            error={error}
            message="We couldn't verify your session. Check your connection and try again."
            onRetry={refetch}
          />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-5">
        <LoadingState label="Taking you to sign in..." />
      </main>
    );
  }

  if (!isRole(currentRole) || currentRole !== expectedRole) {
    return (
      <main className="min-h-screen bg-[#fffaf4] px-5 py-16">
        <ForbiddenState homeHref={getRoleHome(currentRole)} />
      </main>
    );
  }

  const role = roleConfig[currentRole];
  const initials = getDisplayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#fffaf4] text-stone-900">
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-stone-950/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      )}

      <aside
        aria-label="Workspace navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "visible translate-x-0" : "invisible -translate-x-full lg:visible"}`}
        id="workspace-sidebar"
        onKeyDown={mobileNavOpen ? handleMobileNavKeyDown : undefined}
        ref={mobileNavRef}
      >
        <div className="flex h-20 items-center justify-between border-b border-stone-100 px-6">
          <Link
            className="text-2xl font-bold tracking-tight text-stone-950 focus-visible:outline-2 focus-visible:outline-orange-700"
            href={role.path}
          >
            Restora<span className="text-orange-600">.</span>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-orange-700 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav aria-label="Workspace sections" className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <Link
            aria-current={pathname === role.path ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-orange-700 ${pathname === role.path ? "bg-orange-50 font-semibold text-orange-800" : "font-medium text-stone-600 hover:bg-stone-50"}`}
            href={role.path}
          >
            <span aria-hidden="true" className="text-base">⌂</span>
            Overview
          </Link>
          {role.modules.map((module) => (
            module.href ? (
              <Link
                aria-current={pathname === module.href ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-orange-700 ${pathname === module.href ? "bg-orange-50 font-semibold text-orange-800" : "font-medium text-stone-600 hover:bg-stone-50"}`}
                href={module.href}
                key={module.label}
              >
                {module.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm text-stone-400"
                key={module.label}
              >
                {module.label}
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Planned
                </span>
              </span>
            )
          ))}
          <Link
            className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-orange-700"
            href="/"
          >
            <span aria-hidden="true" className="text-base">↗</span>
            Public home
          </Link>
        </nav>

        <div className="border-t border-stone-100 p-5">
          <p className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
            Your access areas
          </p>
          <ul className="mt-3 space-y-2">
            {role.areas.map((area) => (
              <li className="flex items-start gap-2 text-sm text-stone-600" key={area}>
                <span aria-hidden="true" className="mt-1 text-orange-600">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            Workspace modules will appear as they are built.
          </p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-expanded={mobileNavOpen}
                aria-controls="workspace-sidebar"
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                className="rounded-lg border border-stone-200 p-2.5 text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-orange-700 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                ref={mobileToggleRef}
                type="button"
              >
                <span aria-hidden="true">☰</span>
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {role.label} workspace
                </p>
                <nav aria-label="Breadcrumb" className="mt-1 text-xs text-stone-500">
                  <ol className="flex items-center gap-2">
                    <li>
                      <Link className="hover:text-orange-700" href={role.path}>
                        Home
                      </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="truncate">
                      {getBreadcrumb(pathname, currentRole)}
                    </li>
                  </ol>
                </nav>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-48 truncate text-sm font-semibold text-stone-800">
                  {getDisplayName(user)}
                </p>
                <p className="text-xs capitalize text-stone-500">{currentRole}</p>
              </div>
              <span
                aria-hidden="true"
                className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-800"
              >
                {initials}
              </span>
              <Button onClick={handleSignOut} size="sm" variant="secondary">
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          {error && (
            <ErrorState
              className="mb-6"
              error={error}
              message="We couldn't verify your session. Check your connection and try again."
              onRetry={refetch}
            />
          )}
          {signOutError && (
            <Card className="mb-6 border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm text-red-900">
                Sign out failed. Please try again.
              </p>
              <Button className="mt-3" onClick={handleSignOut} size="sm" variant="secondary">
                Retry sign out
              </Button>
            </Card>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
