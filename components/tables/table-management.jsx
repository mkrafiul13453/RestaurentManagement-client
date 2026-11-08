"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import {
  createTable,
  deleteTable,
  listTables,
  updateTable,
  updateTableStatus,
} from "@/lib/tables-api";

const pageSize = 12;

const statusStyles = {
  available: "bg-emerald-100 text-emerald-800",
  occupied: "bg-red-100 text-red-800",
  reserved: "bg-amber-100 text-amber-900",
};

const statusOptions = {
  available: ["reserved"],
  occupied: ["available"],
  reserved: ["available"],
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function TableForm({ table, busy, onCancel, onSave }) {
  const [label, setLabel] = useState(table?.label ?? "");
  const [capacity, setCapacity] = useState(table?.capacity ?? 2);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const trimmedLabel = label.trim();
    const numericCapacity = Number(capacity);
    if (!trimmedLabel || trimmedLabel.length > 50) {
      setError("Enter a table label between 1 and 50 characters.");
      return;
    }
    if (!Number.isInteger(numericCapacity) || numericCapacity < 1 || numericCapacity > 1000) {
      setError("Capacity must be a whole number from 1 to 1000.");
      return;
    }
    setError("");
    onSave({ label: trimmedLabel, capacity: numericCapacity });
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-stone-950">
        {table ? "Edit table" : "Add a table"}
      </h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium text-stone-700">
          Table label
          <input
            autoComplete="off"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            maxLength={50}
            onChange={(event) => setLabel(event.target.value)}
            required
            value={label}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Seats
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            max={1000}
            min={1}
            onChange={(event) => setCapacity(event.target.value)}
            required
            type="number"
            value={capacity}
          />
        </label>
        {error && (
          <p className="text-sm text-red-700 sm:col-span-2" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="secondary">Cancel</Button>
          <Button loading={busy} type="submit">{table ? "Save changes" : "Create table"}</Button>
        </div>
      </form>
    </Card>
  );
}

function StatusActions({ table, busy, onChange }) {
  const options =
    table.status === "occupied" && table.activeOrderId
      ? []
      : statusOptions[table.status];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((status) => (
        <Button
          disabled={busy}
          key={status}
          onClick={() => onChange(table, status)}
          size="sm"
          variant={status === "occupied" ? "primary" : "secondary"}
        >
          Mark {status}
        </Button>
      ))}
    </div>
  );
}

export function TableManagement({ role }) {
  const canManageInventory = role === "admin" || role === "manager";
  const [tables, setTables] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState("floor");
  const [formTable, setFormTable] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTables = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listTables({
        page,
        limit: pageSize,
        search,
        status: statusFilter || undefined,
        signal,
      });
      setTables(result.data.tables);
      setMeta(result.meta);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, refreshKey, search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTables(controller.signal);
    return () => controller.abort();
  }, [loadTables]);

  const columns = useMemo(() => [
    { key: "label", header: "Table" },
    { key: "capacity", header: "Seats" },
    { key: "status", header: "Status", render: (status) => <StatusBadge status={status} /> },
    {
      key: "actions",
      header: "Availability",
      render: (_value, table) => (
        <StatusActions table={table} busy={busy} onChange={changeStatus} />
      ),
    },
    {
      key: "startOrder",
      header: "Order",
      render: (_value, table) => table.status === "available" ? (
        <Link
          className="font-semibold text-orange-700 underline-offset-4 hover:underline"
          href={`/${role}/orders?table=${encodeURIComponent(table._id)}`}
        >
          Start order
        </Link>
      ) : "—",
    },
    ...(canManageInventory
      ? [{
          key: "manage",
          header: "Manage",
          render: (_value, table) => (
            <div className="flex gap-2">
              <Button onClick={() => openEdit(table)} size="sm" variant="secondary">Edit</Button>
              <Button onClick={() => setDeleteTarget(table)} size="sm" variant="danger">Delete</Button>
            </div>
          ),
        }]
      : []),
  ], [busy, canManageInventory]);

  function beginSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openCreate() {
    setFormTable(null);
    setActionError("");
    setShowForm(true);
  }

  function openEdit(table) {
    setFormTable(table);
    setActionError("");
    setShowForm(true);
  }

  async function saveTable(fields) {
    setBusy(true);
    setActionError("");
    try {
      if (formTable) await updateTable(formTable._id, fields);
      else await createTable(fields);
      setShowForm(false);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(table, status) {
    setBusy(true);
    setActionError("");
    try {
      await updateTableStatus(table._id, status, table.status);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error.message);
      setRefreshKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  async function removeTable() {
    if (!deleteTarget) return;
    setBusy(true);
    setActionError("");
    try {
      await deleteTable(deleteTarget._id);
      setDeleteTarget(null);
      if (tables.length === 1 && page > 1) setPage((current) => current - 1);
      else setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const floorCards = tables.map((table) => (
    <Card className="flex min-h-44 flex-col justify-between p-5" key={table._id}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-950">{table.label}</h2>
          <p className="mt-1 text-sm text-stone-600">{table.capacity} seats</p>
        </div>
        <StatusBadge status={table.status} />
      </div>
      <div className="mt-5 space-y-3">
        <StatusActions table={table} busy={busy} onChange={changeStatus} />
        {canManageInventory && (
          <div className="flex gap-2 border-t border-stone-100 pt-3">
            <Button onClick={() => openEdit(table)} size="sm" variant="secondary">Edit</Button>
            <Button onClick={() => setDeleteTarget(table)} size="sm" variant="danger">Delete</Button>
          </div>
        )}
        {table.status === "available" && (
          <Link
            className="inline-flex min-h-10 items-center rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
            href={`/${role}/orders?table=${encodeURIComponent(table._id)}`}
          >
            Start order at this table
          </Link>
        )}
      </div>
    </Card>
  ));

  return (
    <>
      <PageHeader
        description="Review table availability and manage the restaurant floor."
        eyebrow="Restaurant operations"
        title="Table management"
      />

      {actionError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {actionError}
        </div>
      )}

      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto_auto]" onSubmit={beginSearch}>
            <label className="text-sm font-medium text-stone-700">
              Search tables
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
                maxLength={50}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Table label"
                value={searchInput}
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Status
              <select
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
                onChange={(event) => {
                  setPage(1);
                  setStatusFilter(event.target.value);
                }}
                value={statusFilter}
              >
                <option value="">All statuses</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </select>
            </label>
            <Button className="self-end" type="submit" variant="secondary">Search</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button
              aria-pressed={view === "floor"}
              onClick={() => setView("floor")}
              variant={view === "floor" ? "primary" : "secondary"}
            >
              Floor view
            </Button>
            <Button
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              variant={view === "list" ? "primary" : "secondary"}
            >
              List view
            </Button>
            {canManageInventory && <Button onClick={openCreate}>Add table</Button>}
          </div>
        </div>
      </Card>

      {showForm && (
        <TableForm
          busy={busy}
          onCancel={() => setShowForm(false)}
          onSave={saveTable}
          table={formTable}
        />
      )}

      {loading ? (
        <LoadingState label="Loading tables..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="We couldn't load the table list. Check your connection and try again."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : tables.length === 0 ? (
        <EmptyState
          description={search || statusFilter
            ? "Try changing the search or status filter."
            : "Create a table to begin tracking floor availability."}
          title={search || statusFilter ? "No matching tables" : "No tables yet"}
          action={canManageInventory && !search && !statusFilter
            ? <Button onClick={openCreate}>Add first table</Button>
            : undefined}
        />
      ) : view === "floor" ? (
        <section aria-label="Restaurant floor tables" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {floorCards}
        </section>
      ) : (
        <DataTable
          caption="Restaurant table inventory"
          columns={columns}
          emptyTitle="No tables on this page"
          rows={tables}
        />
      )}

      {!loading && !loadError && meta.totalPages > 1 && (
        <nav aria-label="Table list pages" className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            Page {meta.page} of {meta.totalPages} · {meta.total} tables
          </p>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="secondary">
              Previous
            </Button>
            <Button disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} variant="secondary">
              Next
            </Button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        busy={busy}
        confirmLabel="Delete table"
        description={deleteTarget
          ? `Delete ${deleteTarget.label}? Only available tables can be removed.`
          : ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeTable}
        open={Boolean(deleteTarget)}
        title="Delete this table?"
      />
    </>
  );
}
