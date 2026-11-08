import { apiGet, apiRequest } from "@/lib/api";

function isIngredient(ingredient) {
  return (
    ingredient &&
    typeof ingredient._id === "string" &&
    typeof ingredient.name === "string" &&
    typeof ingredient.unit === "string" &&
    Number.isFinite(ingredient.quantity) &&
    ingredient.quantity >= 0 &&
    Number.isFinite(ingredient.minimumStock) &&
    ingredient.minimumStock >= 0 &&
    typeof ingredient.isActive === "boolean"
  );
}

function requireIngredient(ingredient) {
  if (!isIngredient(ingredient)) {
    throw new Error("The Restora server returned an invalid ingredient");
  }
  return ingredient;
}

function requireMeta(meta) {
  if (
    !meta ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.limit) ||
    !Number.isInteger(meta.total) ||
    !Number.isInteger(meta.totalPages)
  ) {
    throw new Error("The Restora server returned invalid pagination metadata");
  }
  return meta;
}

export async function listInventory({ page = 1, limit = 12, search = "", lowStock, signal } = {}) {
  const response = await apiGet("/inventory", {
    query: { page, limit, search: search || undefined, lowStock },
    signal,
  });
  const inventory = response?.data?.inventory;
  if (!Array.isArray(inventory) || !inventory.every(isIngredient)) {
    throw new Error("The Restora server returned an invalid inventory list");
  }
  requireMeta(response.meta);
  return response;
}

export async function getInventory(id, { signal } = {}) {
  const response = await apiGet(`/inventory/${encodeURIComponent(id)}`, { signal });
  return requireIngredient(response?.data?.inventory);
}

export async function listInventoryAdjustments(id, { page = 1, limit = 10, signal } = {}) {
  const response = await apiGet(`/inventory/${encodeURIComponent(id)}/adjustments`, {
    query: { page, limit },
    signal,
  });
  const adjustments = response?.data?.adjustments;
  if (
    !Array.isArray(adjustments) ||
    !adjustments.every((adjustment) => (
      adjustment &&
      typeof adjustment._id === "string" &&
      typeof adjustment.ingredientId === "string" &&
      Number.isFinite(adjustment.delta) &&
      typeof adjustment.unit === "string" &&
      Number.isFinite(adjustment.quantityAfter) &&
      typeof adjustment.reason === "string" &&
      typeof adjustment.actorId === "string" &&
      typeof adjustment.createdAt === "string"
    ))
  ) {
    throw new Error("The Restora server returned invalid inventory adjustments");
  }
  requireMeta(response.meta);
  return response;
}

export async function createIngredient(fields) {
  const response = await apiRequest("/ingredients", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  return requireIngredient(response?.data?.ingredient);
}

export async function updateIngredient(id, fields) {
  const response = await apiRequest(`/ingredients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return requireIngredient(response?.data?.ingredient);
}

export async function archiveIngredient(id) {
  return apiRequest(`/ingredients/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function adjustInventory(id, adjustment) {
  const response = await apiRequest(
    `/inventory/${encodeURIComponent(id)}/adjustments`,
    {
      method: "POST",
      body: JSON.stringify(adjustment),
    },
  );
  const ingredient = requireIngredient(response?.data?.ingredient);
  if (!response?.data?.adjustment || typeof response.data.adjustment._id !== "string") {
    throw new Error("The Restora server returned an invalid inventory adjustment");
  }
  return { ingredient, adjustment: response.data.adjustment };
}
