"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney, parseDollarAmount } from "@/lib/money";
import {
  archiveMenuItem,
  createCategory,
  createMenuItem,
  deleteCategory,
  listCategories,
  listMenuItems,
  updateCategory,
  updateMenuItem,
  uploadMenuItemImage,
} from "@/lib/catalog-api";

function CatalogForm({
  categories,
  category,
  menuItem,
  type,
  initialCategoryId,
  onSave,
  onCancel,
  busy,
}) {
  const [name, setName] = useState(category?.name ?? menuItem?.name ?? "");
  const [description, setDescription] = useState(
    category?.description ?? menuItem?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    menuItem?.categoryId ?? initialCategoryId ?? "",
  );
  const [priceDollars, setPriceDollars] = useState(
    menuItem ? (menuItem.priceMinor / 100).toFixed(2) : "",
  );
  const [isAvailable, setIsAvailable] = useState(menuItem?.isAvailable ?? true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(menuItem?.imageUrl ?? "");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview(removeImage ? "" : menuItem?.imageUrl ?? "");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImage);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [menuItem?.imageUrl, removeImage, selectedImage]);

  function submit(event) {
    event.preventDefault();
    const form = {
      name: name.trim(),
      description: description.trim(),
    };
    if (!form.name) {
      setValidationMessage("A name is required.");
      return;
    }
    if (type === "menuItem") {
      const parsedPrice = parseDollarAmount(priceDollars);
      if (!categoryId || parsedPrice === null) {
        setValidationMessage("Choose a category and enter a price greater than $0.00 with up to two decimal places.");
        return;
      }
      onSave({
        ...form,
        categoryId,
        priceMinor: parsedPrice,
        ...(menuItem ? { isAvailable } : {}),
      }, selectedImage, removeImage);
      return;
    }
    onSave(form);
  }

  const editingCategory = Boolean(category);
  const editingMenuItem = type === "menuItem";

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-stone-950">
        {editingCategory
          ? "Edit category"
          : editingMenuItem
            ? "Edit menu item"
            : categories.length && categoryId
              ? "Add menu item"
              : "Add category"}
      </h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium text-stone-700">
          Name
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Description
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3 focus-visible:outline-2 focus-visible:outline-orange-700"
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        {(editingMenuItem || (!editingCategory && categoryId)) && (
          <>
            <div className="text-sm font-medium text-stone-700 sm:col-span-2">
              <label>
                Food image (JPEG, PNG, WebP, or AVIF; up to 5 MB)
                <input
                  accept="image/jpeg,image/png,image/webp,image/avif,.avif"
                  className="mt-1.5 block min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setValidationMessage("The image must be 5 MB or smaller.");
                      event.target.value = "";
                      return;
                    }
                    setValidationMessage("");
                    setSelectedImage(file);
                    setRemoveImage(false);
                  }}
                  type="file"
                />
              </label>
              {imagePreview && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    alt={`${name || "Menu item"} preview`}
                    className="h-20 w-20 rounded-xl border border-stone-200 object-cover"
                    decoding="async"
                    src={imagePreview}
                  />
                  <Button
                    onClick={() => {
                      setSelectedImage(null);
                      setRemoveImage(true);
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Remove image
                  </Button>
                </div>
              )}
            </div>
            <label className="text-sm font-medium text-stone-700">
              Category
              <select
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3"
                onChange={(event) => setCategoryId(event.target.value)}
                required
                value={categoryId}
              >
                <option value="">Select category</option>
                {categories.map((entry) => (
                  <option key={entry._id} value={entry._id}>{entry.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Price (USD)
              <input
                className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 px-3"
                min="0.01"
                onChange={(event) => setPriceDollars(event.target.value)}
                required
                step="0.01"
                type="number"
                value={priceDollars}
              />
            </label>
            {editingMenuItem && (
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 sm:col-span-2">
                <input
                  checked={isAvailable}
                  onChange={(event) => setIsAvailable(event.target.checked)}
                  type="checkbox"
                />
                Available to order
              </label>
            )}
          </>
        )}
        {validationMessage && (
          <p className="text-sm text-red-700 sm:col-span-2" role="alert">{validationMessage}</p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="secondary">Cancel</Button>
          <Button loading={busy} type="submit">Save</Button>
        </div>
      </form>
    </Card>
  );
}

export function CatalogManagement() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCatalog = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [categoryList, itemList] = await Promise.all([
        listCategories({ signal }),
        listMenuItems({ signal }),
      ]);
      setCategories(categoryList);
      setMenuItems(itemList);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, [loadCatalog]);

  function beginCreateCategory() {
    setEditor({ type: "category" });
    setNotice("");
  }

  function beginCreateMenuItem() {
    if (!categories.length) {
      setNotice("Create a category before adding a menu item.");
      return;
    }
    setEditor({ type: "menuItem", categoryId: categories[0]._id });
    setNotice("");
  }

  async function save(fields, imageFile = null, removeImage = false) {
    setBusy(true);
    setNotice("");
    try {
      if (editor.type === "category") {
        if (editor.record) await updateCategory(editor.record._id, fields);
        else await createCategory(fields);
      } else {
        const menuFields = { ...fields };
        if (imageFile) menuFields.imageUrl = await uploadMenuItemImage(imageFile);
        else if (removeImage) menuFields.imageUrl = "";
        if (editor.record) await updateMenuItem(editor.record._id, menuFields);
        else await createMenuItem(menuFields);
      }
      setEditor(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    setNotice("");
    try {
      if (deleteTarget.type === "category") {
        await deleteCategory(deleteTarget.record._id);
      } else {
        await archiveMenuItem(deleteTarget.record._id);
      }
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  const categoryName = (id) => categories.find((category) => category._id === String(id))?.name ?? "Unknown category";
  const categoryColumns = [
    { key: "name", header: "Category" },
    { key: "description", header: "Description" },
    {
      key: "actions",
      header: "Actions",
      render: (_value, record) => (
        <div className="flex gap-2">
          <Button onClick={() => setEditor({ type: "category", record })} size="sm" variant="secondary">Edit</Button>
          <Button onClick={() => setDeleteTarget({ type: "category", record })} size="sm" variant="danger">Delete</Button>
        </div>
      ),
    },
  ];
  const menuColumns = [
    {
      key: "imageUrl",
      header: "Image",
      render: (url, record) => url
        ? <img alt={record.name} className="h-12 w-12 rounded-lg object-cover" decoding="async" loading="lazy" src={url} />
        : <span className="text-stone-500">No image</span>,
    },
    { key: "name", header: "Menu item" },
    { key: "categoryId", header: "Category", render: (id) => categoryName(id) },
    {
      key: "priceMinor",
      header: "Price (USD)",
      render: (minor) => formatMoney(minor),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_value, record) => (
        <div className="flex gap-2">
          <Button onClick={() => setEditor({ type: "menuItem", record })} size="sm" variant="secondary">Edit</Button>
          <Button
            onClick={() => setDeleteTarget({ type: "menuItem", record })}
            size="sm"
            variant="danger"
          >
            Archive
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        actions={
          <>
            <Button onClick={beginCreateCategory} variant="secondary">Add category</Button>
            <Button onClick={beginCreateMenuItem}>Add menu item</Button>
          </>
        }
        description="Maintain categories and server-priced menu items available for order creation."
        eyebrow="Catalog"
        title="Food and categories"
      />
      {notice && (
        <p className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="alert">
          {notice}
        </p>
      )}
      {editor && (
        <CatalogForm
          busy={busy}
          categories={categories}
          category={editor.type === "category" ? editor.record : null}
          initialCategoryId={editor.categoryId}
          menuItem={editor.type === "menuItem" ? editor.record : null}
          onCancel={() => setEditor(null)}
          onSave={save}
          type={editor.type}
        />
      )}
      {loading ? (
        <LoadingState label="Loading the catalog..." />
      ) : loadError ? (
        <ErrorState
          error={loadError}
          message="The catalog could not be loaded. Check your connection and try again."
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="categories-heading">
            <h2 className="mb-3 text-lg font-bold" id="categories-heading">Categories</h2>
            {categories.length
              ? <DataTable caption="Menu categories" columns={categoryColumns} rows={categories} />
              : <EmptyState title="No categories yet" description="Add a category before creating menu items." />}
          </section>
          <section aria-labelledby="menu-items-heading">
            <h2 className="mb-3 text-lg font-bold" id="menu-items-heading">Available menu items</h2>
            {menuItems.length
              ? <DataTable caption="Menu items available to order" columns={menuColumns} rows={menuItems} />
              : <EmptyState title="No available menu items" description="Create an item in a category to make it available for ordering." />}
          </section>
        </div>
      )}
      <ConfirmDialog
        busy={busy}
        confirmLabel={deleteTarget?.type === "category" ? "Delete category" : "Archive item"}
        description={deleteTarget?.type === "category"
          ? `Delete category "${deleteTarget.record.name}"? Categories referenced by menu items cannot be deleted.`
          : `Archive "${deleteTarget?.record.name}"? It will no longer be available for new orders.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === "category" ? "Delete category?" : "Archive menu item?"}
      />
    </>
  );
}
