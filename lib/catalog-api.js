import { apiGet, apiRequest } from "@/lib/api";

export async function listCategories({ page = 1, limit = 100, signal } = {}) {
  const response = await apiGet("/categories", {
    query: { page, limit },
    signal,
  });
  if (!Array.isArray(response?.data?.categories)) {
    throw new Error("The Restora server returned an invalid category list");
  }
  return response.data.categories;
}

export async function listMenuItems({ page = 1, limit = 100, signal } = {}) {
  const response = await apiGet("/menu-items", {
    query: { page, limit },
    signal,
  });
  if (!Array.isArray(response?.data?.menuItems)) {
    throw new Error("The Restora server returned an invalid menu list");
  }
  return response.data.menuItems;
}

async function save(path, method, fields, key) {
  const response = await apiRequest(path, {
    method,
    body: JSON.stringify(fields),
  });
  const record = response?.data?.[key];
  if (!record || typeof record._id !== "string") {
    throw new Error("The Restora server returned an invalid catalog record");
  }
  return record;
}

export function createCategory(fields) {
  return save("/categories", "POST", fields, "category");
}

export function updateCategory(id, fields) {
  return save(`/categories/${encodeURIComponent(id)}`, "PATCH", fields, "category");
}

export function deleteCategory(id) {
  return apiRequest(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function createMenuItem(fields) {
  return save("/menu-items", "POST", fields, "menuItem");
}

export async function uploadMenuItemImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await apiRequest("/menu-items/images", {
    method: "POST",
    body: formData,
  });
  if (typeof response?.data?.imageUrl !== "string") {
    throw new Error("The Restora server returned an invalid image upload response");
  }
  return response.data.imageUrl;
}

export function updateMenuItem(id, fields) {
  return save(`/menu-items/${encodeURIComponent(id)}`, "PATCH", fields, "menuItem");
}

export async function archiveMenuItem(id) {
  return save(`/menu-items/${encodeURIComponent(id)}`, "DELETE", undefined, "menuItem");
}
