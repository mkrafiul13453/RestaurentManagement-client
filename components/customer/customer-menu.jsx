"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { listCategories, listMenuItemsPage } from "@/lib/catalog-api";
import { formatMoney } from "@/lib/money";
import { createOrder } from "@/lib/orders-api";

const pageSize = 12;

export function CustomerMenu() {
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(null);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState(null);
  const [cart, setCart] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderCreated, setOrderCreated] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesError(null);
    listCategories({ page: 1, limit: 100, signal: controller.signal })
      .then(setCategories)
      .catch((failure) => {
        if (failure.name !== "AbortError") setCategoriesError(failure);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadItems() {
      setLoadingItems(true);
      setItemsError(null);
      try {
        const response = await listMenuItemsPage({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          categoryId: categoryId || undefined,
          signal: controller.signal,
        });
        setItems(response.data.menuItems);
        setMeta(response.meta);
      } catch (failure) {
        if (failure.name !== "AbortError") setItemsError(failure);
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false);
      }
    }
    void loadItems();
    return () => controller.abort();
  }, [categoryId, page, reloadKey, search]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [String(category._id), category.name])),
    [categories],
  );
  const cartItems = Object.values(cart);
  const estimatedSubtotal = cartItems.reduce(
    (total, { item, quantity }) => total + item.priceMinor * quantity,
    0,
  );

  function changeQuantity(item, delta) {
    setCart((current) => {
      const quantity = (current[item._id]?.quantity ?? 0) + delta;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[item._id];
        return next;
      }
      if (quantity > 99) return current;
      return { ...current, [item._id]: { item, quantity } };
    });
  }

  async function submitOrder() {
    if (!cartItems.length) return;
    setPlacingOrder(true);
    setOrderError("");
    setOrderCreated("");
    try {
      const order = await createOrder({
        items: cartItems.map(({ item, quantity }) => ({
          menuItemId: item._id,
          quantity,
        })),
      });
      setCart({});
      setOrderCreated(order._id);
    } catch (failure) {
      setOrderError(failure.message);
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <>
      <PageHeader
        description="Browse the available menu, add dishes to your cart, and place an order. The server confirms item availability and calculates your final bill."
        eyebrow="Order online"
        title="Food menu"
      />

      {orderCreated && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50 p-4" role="status">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-emerald-950">
              Order placed{orderCreated !== "created" ? ` · ${orderCreated.slice(-6).toUpperCase()}` : ""}. Track its status and pay securely from your orders.
            </p>
            <Link
              className="text-sm font-semibold text-emerald-900 underline underline-offset-4"
              href="/customer/orders"
            >
              View my orders
            </Link>
          </div>
        </Card>
      )}
      {orderError && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {orderError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Available food">
          <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <label className="text-sm font-medium text-stone-700">
              Search menu
              <input
                autoComplete="off"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
                maxLength={120}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search dishes"
                type="search"
                value={search}
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Category
              <select
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
                onChange={(event) => {
                  setPage(1);
                  setCategoryId(event.target.value);
                }}
                value={categoryId}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </label>
          </Card>

          {categoriesError && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
              Categories could not be loaded. You can still browse all available items.
              <button
                className="ml-2 font-semibold underline underline-offset-4"
                onClick={() => setReloadKey((key) => key + 1)}
                type="button"
              >
                Try again
              </button>
            </p>
          )}
          {itemsError && (
            <ErrorState
              error={itemsError}
              message="Available menu items could not be loaded."
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {loadingItems ? (
            <LoadingState label="Loading the available menu..." />
          ) : !itemsError && items.length === 0 ? (
            <EmptyState
              description={search || categoryId
                ? "Try another search or category."
                : "There are no available menu items right now. Please check back soon."}
              title={search || categoryId ? "No matching dishes" : "Menu coming soon"}
            />
          ) : !itemsError ? (
            <>
              <p className="mb-3 text-sm text-stone-600">
                {meta.total} available {meta.total === 1 ? "item" : "items"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <Card className="flex h-full flex-col overflow-hidden" key={item._id}>
                    {item.imageUrl ? (
                      <img
                        alt={item.name}
                        className="h-44 w-full bg-stone-100 object-cover"
                        loading="lazy"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="grid h-32 place-items-center bg-gradient-to-br from-orange-100 to-amber-50 text-3xl text-orange-700"
                      >
                        <span>R</span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                        {categoriesById.get(String(item.categoryId)) ?? "Menu item"}
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-stone-950">{item.name}</h2>
                      {item.description && (
                        <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="font-bold text-stone-950">{formatMoney(item.priceMinor)}</span>
                        <Button onClick={() => changeQuantity(item, 1)} size="sm">
                          Add to cart
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {meta.totalPages > 1 && (
                <nav aria-label="Menu pages" className="mt-6 flex items-center justify-between gap-3">
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
            </>
          ) : null}
        </section>

        <aside aria-labelledby="cart-title">
          <Card className="p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-stone-950" id="cart-title">Your cart</h2>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-900">
                {cartItems.reduce((total, line) => total + line.quantity, 0)}
              </span>
            </div>
            {cartItems.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-stone-600">
                Your cart is empty. Add a dish from the menu to get started.
              </p>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-stone-100">
                  {cartItems.map(({ item, quantity }) => (
                    <li className="py-3" key={item._id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold text-stone-900">{item.name}</p>
                        <p className="shrink-0 text-sm font-semibold text-stone-800">
                          {formatMoney(item.priceMinor * quantity)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => changeQuantity(item, -1)}
                          size="sm"
                          variant="secondary"
                        >
                          −
                        </Button>
                        <span aria-live="polite" className="min-w-6 text-center text-sm">{quantity}</span>
                        <Button
                          aria-label={`Add one ${item.name}`}
                          disabled={quantity >= 99}
                          onClick={() => changeQuantity(item, 1)}
                          size="sm"
                          variant="secondary"
                        >
                          +
                        </Button>
                        <button
                          className="ml-auto min-h-10 px-2 text-xs font-semibold text-stone-600 underline underline-offset-4 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-orange-700"
                          onClick={() => setCart((current) => {
                            const next = { ...current };
                            delete next[item._id];
                            return next;
                          })}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-stone-200 pt-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold text-stone-800">Estimated subtotal</span>
                    <span className="font-bold text-stone-950">{formatMoney(estimatedSubtotal)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    Final prices, tax, and total are calculated by the server when your order is placed.
                  </p>
                  <Button
                    className="mt-4 w-full"
                    loading={placingOrder}
                    onClick={submitOrder}
                    disabled={cartItems.length === 0}
                  >
                    Place order
                  </Button>
                </div>
              </>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
