"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import {
  adjustInventory,
  archiveIngredient,
  createIngredient,
  getInventory,
  listInventory,
  listInventoryAdjustments,
  updateIngredient,
} from "@/lib/inventory-api";

const pageSize = 12;
const historyPageSize = 8;

function IngredientForm({ ingredient, busy, onCancel, onSave }) {
  const [name, setName] = useState(ingredient?.name ?? "");
  const [unit, setUnit] = useState(ingredient?.unit ?? "");
  const [minimumStock, setMinimumStock] = useState(ingredient?.minimumStock ?? 0);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const fields = {
      name: name.trim(),
      unit: unit.trim(),
      minimumStock: Number(minimumStock),
    };
    if (!fields.name || fields.name.length > 120 || !fields.unit || fields.unit.length > 32) {
      setError("Enter an ingredient name and unit within the allowed lengths.");
      return;
    }
    if (!Number.isFinite(fields.minimumStock) || fields.minimumStock < 0) {
      setError("Minimum stock must be a non-negative number.");
      return;
    }
    setError("");
    onSave(fields);
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-stone-950">
        {ingredient ? "Edit ingredient" : "Add an ingredient"}
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Stock starts at zero. Record opening stock as an audited adjustment.
      </p>
      <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={submit}>
        <label className="text-sm font-medium text-stone-700">
          Ingredient name
          <input
            autoComplete="off"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Unit
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            maxLength={32}
            onChange={(event) => setUnit(event.target.value)}
            required
            value={unit}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Minimum stock
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            min={0}
            onChange={(event) => setMinimumStock(event.target.value)}
            required
            step="any"
            type="number"
            value={minimumStock}
          />
        </label>
        {error && (
          <p className="text-sm text-red-700 sm:col-span-3" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:col-span-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="secondary">Cancel</Button>
          <Button loading={busy} type="submit">{ingredient ? "Save changes" : "Create ingredient"}</Button>
        </div>
      </form>
    </Card>
  );
}

function AdjustmentForm({ ingredient, busy, onSave }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta) || numericDelta === 0) {
      setError("Enter a non-zero stock change.");
      return;
    }
    if (!reason.trim() || reason.trim().length > 500) {
      setError("Enter a reason up to 500 characters.");
      return;
    }
    setError("");
    onSave({ delta: numericDelta, reason: reason.trim() }, () => {
      setDelta("");
      setReason("");
    });
  }

  return (
    <form className="mt-5 border-t border-stone-200 pt-5" onSubmit={submit}>
      <h3 className="font-semibold text-stone-900">Adjust stock</h3>
      <p className="mt-1 text-sm text-stone-600">
        Use a positive number to add {ingredient.unit}, or a negative number to remove it.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
        <label className="text-sm font-medium text-stone-700">
          Change ({ingredient.unit})
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            onChange={(event) => setDelta(event.target.value)}
            required
            step="any"
            type="number"
            value={delta}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Reason
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
        </label>
        <div className="flex items-end">
          <Button className="w-full sm:w-auto" loading={busy} type="submit">Save adjustment</Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </form>
  );
}

export function InventoryManagement({ role }) {
  const canManage = role === "admin" || role === "manager";
  const [inventory, setInventory] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, limit: historyPageSize, total: 0, totalPages: 0 });
  const [historyPage, setHistoryPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formIngredient, setFormIngredient] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadInventory = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listInventory({
        page,
        limit: pageSize,
        search,
        lowStock: lowStock || undefined,
        signal,
      });
      setInventory(result.data.inventory);
      setMeta(result.meta);
      setSelectedId((current) => (
        result.data.inventory.some((ingredient) => ingredient._id === current)
          ? current
          : result.data.inventory[0]?._id ?? ""
      ));
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, lowStock, refreshKey, search]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInventory(controller.signal);
    return () => controller.abort();
  }, [loadInventory]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setAdjustments([]);
      setDetailError(null);
      return undefined;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    Promise.all([
      getInventory(selectedId, { signal: controller.signal }),
      listInventoryAdjustments(selectedId, {
        page: historyPage,
        limit: historyPageSize,
        signal: controller.signal,
      }),
    ]).then(([ingredient, history]) => {
      setSelected(ingredient);
      setAdjustments(history.data.adjustments);
      setHistoryMeta(history.meta);
    }).catch((error) => {
      if (error.name !== "AbortError") setDetailError(error);
    }).finally(() => {
      if (!controller.signal.aborted) setDetailLoading(false);
    });
    return () => controller.abort();
  }, [historyPage, refreshKey, selectedId]);

  const columns = useMemo(() => [
    { key: "name", header: "Ingredient" },
    { key: "quantity", header: "On hand", render: (quantity, item) => `${quantity} ${item.unit}` },
    { key: "minimumStock", header: "Minimum", render: (quantity, item) => `${quantity} ${item.unit}` },
    {
      key: "stock",
      header: "Stock status",
      render: (_value, item) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.quantity <= item.minimumStock ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
          {item.quantity <= item.minimumStock ? "Low stock" : "In stock"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_value, item) => (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => {
            setSelectedId(item._id);
            setHistoryPage(1);
          }} size="sm" variant="secondary">
            Details
          </Button>
          {canManage && (
            <Button onClick={() => {
              setFormIngredient(item);
              setShowForm(true);
              setActionError("");
            }} size="sm" variant="secondary">
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ], [canManage]);

  async function saveIngredient(fields) {
    setBusy(true);
    setActionError("");
    try {
      const ingredient = formIngredient
        ? await updateIngredient(formIngredient._id, fields)
        : await createIngredient(fields);
      setShowForm(false);
      setFormIngredient(null);
      setSelectedId(ingredient._id);
      setHistoryPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAdjustment(fields, onSuccess) {
    setBusy(true);
    setActionError("");
    try {
      await adjustInventory(selectedId, fields);
      onSuccess();
      setHistoryPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setBusy(true);
    setActionError("");
    try {
      await archiveIngredient(archiveTarget._id);
      setArchiveTarget(null);
      setShowForm(false);
      setFormIngredient(null);
      setSelectedId("");
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function beginCreate() {
    setFormIngredient(null);
    setShowForm(true);
    setActionError("");
  }

  return (
    <>
      <PageHeader
        description={canManage
          ? "Manage ingredient records and record every stock change with its reason and authenticated staff member."
          : "View current ingredient stock, minimum levels, and the adjustment history."}
        eyebrow="Stock control"
        title="Inventory"
        actions={canManage && (
          <Button onClick={beginCreate}>Add ingredient</Button>
        )}
      />

      {actionError && (
        <div className="mb-5">
          <ErrorState error={actionError} message={actionError} />
        </div>
      )}

      {showForm && canManage && (
        <IngredientForm
          busy={busy}
          ingredient={formIngredient}
          onCancel={() => {
            setShowForm(false);
            setFormIngredient(null);
          }}
          onSave={saveIngredient}
        />
      )}

      <Card className="mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <form className="flex flex-1 flex-col gap-2 sm:flex-row" onSubmit={applySearch}>
            <label className="flex-1 text-sm font-medium text-stone-700">
              Search ingredients
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-orange-700"
                maxLength={120}
                onChange={(event) => setSearchInput(event.target.value)}
                value={searchInput}
              />
            </label>
            <Button className="self-end" type="submit">Search</Button>
          </form>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-stone-700">
            <input
              checked={lowStock}
              onChange={(event) => {
                setPage(1);
                setLowStock(event.target.checked);
              }}
              type="checkbox"
            />
            Low-stock items only
          </label>
        </div>
      </Card>

      {loading ? (
        <LoadingState label="Loading inventory..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="We couldn't load inventory. Check the connection and try again."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : inventory.length === 0 ? (
        <EmptyState
          description={search || lowStock
            ? "Try a different search or clear the low-stock filter."
            : "Create an ingredient record to begin tracking stock."}
          title={search || lowStock ? "No matching ingredients" : "No inventory yet"}
          action={canManage && !search && !lowStock
            ? <Button onClick={beginCreate}>Add ingredient</Button>
            : undefined}
        />
      ) : (
        <>
          <DataTable
            caption="Ingredient inventory"
            columns={columns}
            rows={inventory}
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-stone-600">
              Page {meta.page} of {Math.max(meta.totalPages, 1)} · {meta.total} ingredients
            </p>
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
          </div>
        </>
      )}

      <section aria-labelledby="inventory-detail-heading" className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-stone-950" id="inventory-detail-heading">
          Inventory details and adjustments
        </h2>
        {detailLoading ? (
          <LoadingState label="Loading inventory details..." />
        ) : detailError ? (
          <ErrorState error={detailError} message="We couldn't load the inventory details." />
        ) : selected ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-stone-950">{selected.name}</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Current stock: <strong>{selected.quantity} {selected.unit}</strong>
                  {" · "}Minimum: {selected.minimumStock} {selected.unit}
                </p>
                {!selected.isActive && (
                  <p className="mt-2 text-sm font-semibold text-stone-500">Archived ingredient</p>
                )}
              </div>
              {canManage && selected.isActive && selected.quantity === 0 && (
                <Button onClick={() => setArchiveTarget(selected)} variant="danger">
                  Archive ingredient
                </Button>
              )}
            </div>

            {canManage && selected.isActive && (
              <AdjustmentForm ingredient={selected} busy={busy} onSave={saveAdjustment} />
            )}

            <div className="mt-6">
              <h4 className="font-semibold text-stone-900">Adjustment history</h4>
              {adjustments.length === 0 ? (
                <p className="mt-2 text-sm text-stone-600">No stock adjustments recorded.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
                      <tr>
                        <th className="px-4 py-3" scope="col">When</th>
                        <th className="px-4 py-3" scope="col">Change</th>
                        <th className="px-4 py-3" scope="col">Stock after</th>
                        <th className="px-4 py-3" scope="col">Reason</th>
                        <th className="px-4 py-3" scope="col">Staff ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {adjustments.map((adjustment) => (
                        <tr key={adjustment._id}>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                            {new Date(adjustment.createdAt).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                            {adjustment.delta > 0 ? "+" : ""}{adjustment.delta} {adjustment.unit}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                            {adjustment.quantityAfter} {adjustment.unit}
                          </td>
                          <td className="px-4 py-3 text-stone-700">{adjustment.reason}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-700">{adjustment.actorId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {historyMeta.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-stone-600">
                    History page {historyMeta.page} of {historyMeta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((value) => value - 1)}
                      size="sm"
                      variant="secondary"
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={historyPage >= historyMeta.totalPages}
                      onClick={() => setHistoryPage((value) => value + 1)}
                      size="sm"
                      variant="secondary"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <EmptyState
            description="Select an ingredient from the inventory list to view its record and adjustment history."
            title="Choose an ingredient"
          />
        )}
      </section>

      <ConfirmDialog
        busy={busy}
        confirmLabel="Archive ingredient"
        description={`Archive ${archiveTarget?.name ?? "this ingredient"}? Stock must be zero. The adjustment history will be retained.`}
        onClose={() => {
          if (!busy) setArchiveTarget(null);
        }}
        onConfirm={confirmArchive}
        open={Boolean(archiveTarget)}
        title="Archive ingredient"
      />
    </>
  );
}
