"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import {
  cancelReservation,
  createReservation,
  listReservationTables,
  listReservations,
  updateReservation,
} from "@/lib/reservations-api";

const pageSize = 10;

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ReservationForm({ tables, record, busy, onCancel, onSave }) {
  const [tableId, setTableId] = useState(String(record?.table?._id ?? record?.tableId ?? ""));
  const [startsAt, setStartsAt] = useState(localDateTime(record?.startsAt));
  const [endsAt, setEndsAt] = useState(localDateTime(record?.endsAt));
  const [partySize, setPartySize] = useState(String(record?.partySize ?? 2));
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const size = Number(partySize);
    if (!tableId || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
        start <= new Date() || end <= start || !Number.isSafeInteger(size) || size < 1) {
      setError("Choose a table, a future start and end time, and a valid party size.");
      return;
    }
    if (!tables.some((table) => table._id === tableId)) {
      setError("Choose a valid restaurant table.");
      return;
    }
    setError("");
    onSave({
      tableId,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      partySize: size,
      notes: notes.trim(),
    });
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-stone-950">
        {record ? "Update reservation" : "Create a reservation"}
      </h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium text-stone-700">
          Table
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            onChange={(event) => setTableId(event.target.value)}
            required
            value={tableId}
          >
            <option value="">Select a table</option>
            {tables.map((table) => (
              <option key={table._id} value={table._id}>
                {table.label} · seats {table.capacity}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          Party size
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
            max={1000}
            min={1}
            onChange={(event) => setPartySize(event.target.value)}
            required
            type="number"
            value={partySize}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Starts at
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
            onChange={(event) => setStartsAt(event.target.value)}
            required
            type="datetime-local"
            value={startsAt}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Ends at
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
            onChange={(event) => setEndsAt(event.target.value)}
            required
            type="datetime-local"
            value={endsAt}
          />
        </label>
        <label className="text-sm font-medium text-stone-700 sm:col-span-2">
          Notes (optional)
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-xl border border-stone-300 px-3 py-2"
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>
        {error && <p className="text-sm text-red-700 sm:col-span-2" role="alert">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="secondary">Close</Button>
          <Button loading={busy} type="submit">{record ? "Save changes" : "Book table"}</Button>
        </div>
      </form>
    </Card>
  );
}

export function ReservationManagement({ role }) {
  const isAdmin = role === "admin";
  const canManage = ["manager", "waiter", "customer"].includes(role);
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [response, tableList] = await Promise.all([
          listReservations({
            page,
            limit: pageSize,
            date: date || undefined,
            status: status || undefined,
            tableId: tableId || undefined,
            signal: controller.signal,
          }),
          listReservationTables({ signal: controller.signal }),
        ]);
        setReservations(response.data.reservations);
        setMeta(response.meta);
        setTables(tableList);
      } catch (error) {
        if (error.name !== "AbortError") setLoadError(error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [date, page, refreshKey, status, tableId]);

  async function save(fields) {
    setBusy(true);
    setNotice("");
    try {
      if (editor?.record) await updateReservation(editor.record._id, fields);
      else await createReservation(fields);
      setEditor(null);
      setNotice(editor?.record ? "Reservation updated." : "Reservation created.");
      reload();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!cancelTarget) return;
    setBusy(true);
    setNotice("");
    try {
      await cancelReservation(cancelTarget._id);
      setCancelTarget(null);
      setNotice("Reservation cancelled.");
      reload();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  const title = isAdmin ? "Reservation summary" : role === "customer" ? "My reservations" : "Reservations";
  return (
    <>
      <PageHeader
        actions={canManage ? <Button onClick={() => setEditor({ record: null })}>New reservation</Button> : null}
        description={isAdmin
          ? "Read-only summary of reservation times, tables, party sizes, and status."
          : role === "customer"
            ? "Book a real restaurant table and manage your own reservations."
            : "Create, update, and cancel table reservations."}
        eyebrow="Restaurant operations"
        title={title}
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="status">
          {notice}
        </p>
      )}
      {editor && (
        <ReservationForm
          busy={busy}
          onCancel={() => setEditor(null)}
          onSave={save}
          record={editor.record}
          tables={tables}
        />
      )}

      <Card className="mb-5 grid gap-4 p-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-stone-700">
          Date
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
            onChange={(event) => { setPage(1); setDate(event.target.value); }}
            type="date"
            value={date}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Status
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            onChange={(event) => { setPage(1); setStatus(event.target.value); }}
            value={status}
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          Table
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
            onChange={(event) => { setPage(1); setTableId(event.target.value); }}
            value={tableId}
          >
            <option value="">All tables</option>
            {tables.map((table) => (
              <option key={table._id} value={table._id}>{table.label}</option>
            ))}
          </select>
        </label>
      </Card>

      {loading ? (
        <LoadingState label="Loading reservations..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="Reservations could not be loaded. Check your connection and try again."
          onRetry={reload}
        />
      ) : reservations.length === 0 ? (
        <EmptyState
          description="Try changing the filters or create a reservation."
          title="No reservations found"
        />
      ) : (
        <section aria-label="Reservations" className="space-y-4">
          {reservations.map((reservation) => (
            <Card className="p-5 sm:p-6" key={reservation._id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold text-stone-950">
                    {reservation.table?.label ?? "Restaurant table"}
                    {reservation.partySize ? ` · party of ${reservation.partySize}` : ""}
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    <time dateTime={reservation.startsAt}>{new Date(reservation.startsAt).toLocaleString()}</time>
                    {" – "}
                    <time dateTime={reservation.endsAt}>{new Date(reservation.endsAt).toLocaleString()}</time>
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${reservation.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-700"}`}>
                  {reservation.status}
                </span>
              </div>
              {canManage && reservation.status === "confirmed" && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                  <Button onClick={() => setEditor({ record: reservation })} size="sm" variant="secondary">
                    Edit
                  </Button>
                  <Button onClick={() => setCancelTarget(reservation)} size="sm" variant="danger">
                    Cancel reservation
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      {!loading && !loadError && meta.totalPages > 1 && (
        <nav aria-label="Reservation pages" className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="secondary">Previous</Button>
            <Button disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
          </div>
        </nav>
      )}
      <ConfirmDialog
        busy={busy}
        confirmLabel="Cancel reservation"
        description={cancelTarget
          ? `Cancel the reservation for ${cancelTarget.table?.label ?? "this table"}?`
          : ""}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancel}
        open={Boolean(cancelTarget)}
        title="Cancel this reservation?"
      />
    </>
  );
}
