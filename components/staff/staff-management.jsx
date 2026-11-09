"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { roleConfig } from "@/lib/roles";
import { listStaff, updateStaffRole } from "@/lib/staff-api";

const pageSize = 10;
const roles = Object.keys(roleConfig);

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : "Date unavailable";
}

function RoleBadge({ role }) {
  return (
    <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-900">
      {roleConfig[role]?.label ?? role}
    </span>
  );
}

export function StaffManagement() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ? String(session.user.id) : "";
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [staff, setStaff] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [draftRoles, setDraftRoles] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => setRetryKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await listStaff({
          page,
          limit: pageSize,
          search: appliedSearch || undefined,
          role: roleFilter || undefined,
          signal: controller.signal,
        });
        setStaff(response.data.staff);
        setMeta(response.meta);
        setDraftRoles({});
      } catch (failure) {
        if (failure.name !== "AbortError") setLoadError(failure);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [appliedSearch, page, retryKey, roleFilter]);

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  async function confirmRoleChange() {
    if (!confirmation) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateStaffRole(
        confirmation.staff.id,
        confirmation.staff.role,
        confirmation.role,
      );
      setConfirmation(null);
      setNotice({
        type: "success",
        message: `${updated.name || updated.email} is now ${roleConfig[updated.role].label}.`,
      });
      reload();
    } catch (failure) {
      setNotice({ type: "error", message: failure.message });
      if (failure.message.includes("role has changed")) reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        description="Review account details and assign one of the approved Restora roles. Role changes are recorded with the administrator and previous and new roles."
        eyebrow="Administrator workspace"
        title="Staff management"
      />

      {notice && (
        <p
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-red-200 bg-red-50 text-red-900"}`}
          role={notice.type === "success" ? "status" : "alert"}
        >
          {notice.message}
        </p>
      )}

      <Card className="mb-5 grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={applySearch}>
          <label className="min-w-0 flex-1 text-sm font-medium text-stone-700">
            Search by email
            <input
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search account email"
              type="search"
              value={search}
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            {appliedSearch && (
              <Button
                onClick={() => {
                  setSearch("");
                  setAppliedSearch("");
                  setPage(1);
                }}
                variant="secondary"
              >
                Clear
              </Button>
            )}
          </div>
        </form>
        <label className="text-sm font-medium text-stone-700">
          Filter by role
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
            onChange={(event) => {
              setPage(1);
              setRoleFilter(event.target.value);
            }}
            value={roleFilter}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{roleConfig[role].label}</option>
            ))}
          </select>
        </label>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-stone-600">
          {meta.total} accounts
          {appliedSearch ? ` matching “${appliedSearch}”` : ""}
          {roleFilter ? ` · ${roleConfig[roleFilter].label}` : ""}
        </p>
        <Button onClick={reload} size="sm" variant="secondary">Refresh</Button>
      </div>

      {loading ? (
        <LoadingState label="Loading staff accounts..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="Staff accounts could not be loaded."
          onRetry={reload}
        />
      ) : staff.length === 0 ? (
        <EmptyState
          description={appliedSearch || roleFilter
            ? "Try another search or role filter."
            : "Accounts will appear here as people register or are onboarded."}
          title={appliedSearch || roleFilter ? "No matching accounts" : "No accounts yet"}
        />
      ) : (
        <section aria-label="Staff accounts" className="space-y-3">
          {staff.map((account) => {
            const isSelf = account.id === currentUserId;
            const draftRole = draftRoles[account.id] ?? account.role;
            return (
              <Card
                className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                key={account.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-950">
                    {account.name || "Unnamed account"}
                  </p>
                  <p className="mt-1 break-all text-sm text-stone-600">{account.email}</p>
                  <p className="mt-1 text-xs text-stone-500">Account created {formatDate(account.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Current role
                    </span>
                    <RoleBadge role={account.role} />
                  </div>
                  {isSelf ? (
                    <span className="text-xs font-medium text-stone-500">Your account</span>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor={`role-${account.id}`}>
                        New role for {account.name || account.email}
                      </label>
                      <select
                        className="min-h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-orange-700"
                        id={`role-${account.id}`}
                        onChange={(event) => setDraftRoles((current) => ({
                          ...current,
                          [account.id]: event.target.value,
                        }))}
                        value={draftRole}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>{roleConfig[role].label}</option>
                        ))}
                      </select>
                      <Button
                        disabled={draftRole === account.role}
                        onClick={() => setConfirmation({ staff: account, role: draftRole })}
                        size="sm"
                        variant="secondary"
                      >
                        Change role
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {!loading && !loadError && meta.totalPages > 1 && (
        <nav aria-label="Staff account pages" className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((value) => value + 1)}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        busy={saving}
        confirmLabel="Confirm role change"
        description={confirmation
          ? `Change ${confirmation.staff.name || confirmation.staff.email} from ${roleConfig[confirmation.staff.role].label} to ${roleConfig[confirmation.role].label}? This change will be recorded in the role audit log.`
          : ""}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmRoleChange}
        open={Boolean(confirmation)}
        title="Confirm staff role change"
      />
    </>
  );
}
