export const roleConfig = {
  admin: {
    label: "Administrator",
    path: "/admin",
    areas: ["Full access"],
    modules: [
      { label: "Customer directory", href: "/admin/customers" },
      { label: "Food and categories", href: "/admin/menu" },
      { label: "Orders", href: "/admin/orders" },
      { label: "Payments", href: "/admin/payments" },
      { label: "Tables", href: "/admin/tables" },
      { label: "Reservations", href: "/admin/reservations" },
      { label: "Inventory", href: "/admin/inventory" },
      { label: "Staff management", href: "/admin/staff" },
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Reports", href: "/admin/reports" },
    ],
  },
  manager: {
    label: "Manager",
    path: "/manager",
    areas: ["Menu", "Tables", "Reservations", "Inventory", "Coupons", "Reports", "Refunds"],
    modules: [
      { label: "Customer directory", href: "/manager/customers" },
      { label: "Food and categories", href: "/manager/menu" },
      { label: "Orders", href: "/manager/orders" },
      { label: "Payments", href: "/manager/payments" },
      { label: "Tables", href: "/manager/tables" },
      { label: "Reservations", href: "/manager/reservations" },
      { label: "Inventory", href: "/manager/inventory" },
      { label: "Notifications", href: "/manager/notifications" },
      { label: "Reports", href: "/manager/reports" },
    ],
  },
  waiter: {
    label: "Waiter",
    path: "/waiter",
    areas: ["Tables", "Orders", "Reservations"],
    modules: [
      { label: "Tables", href: "/waiter/tables" },
      { label: "Reservations", href: "/waiter/reservations" },
      { label: "Orders", href: "/waiter/orders" },
      { label: "Notifications", href: "/waiter/notifications" },
    ],
  },
  chef: {
    label: "Chef",
    path: "/chef",
    areas: ["Kitchen status", "Inventory read"],
    modules: [
      { label: "Kitchen queue", href: "/chef/kitchen" },
      { label: "Orders", href: "/chef/orders" },
      { label: "Inventory", href: "/chef/inventory" },
      { label: "Notifications", href: "/chef/notifications" },
    ],
  },
  cashier: {
    label: "Cashier",
    path: "/cashier",
    areas: ["Bills", "Payments", "Order completion"],
    modules: [
      { label: "Ready orders", href: "/cashier/orders" },
      { label: "Bills" },
      { label: "Payments", href: "/cashier/payments" },
      { label: "Notifications", href: "/cashier/notifications" },
    ],
  },
  customer: {
    label: "Customer",
    path: "/customer",
    areas: ["Browse menu", "Own orders", "Own reservations", "Payments"],
    modules: [
      { label: "Menu", href: "/customer/menu" },
      { label: "My orders", href: "/customer/orders" },
      { label: "My reservations", href: "/customer/reservations" },
      { label: "Payments", href: "/customer/payments" },
      { label: "Notifications", href: "/customer/notifications" },
    ],
  },
};

export function getRoleHome(role) {
  return roleConfig[normalizeRole(role)]?.path ?? roleConfig.customer.path;
}

export function getRoleFromPath(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return roleConfig[firstSegment?.toLowerCase()] ? firstSegment.toLowerCase() : null;
}

export function isRole(role) {
  return Object.hasOwn(roleConfig, normalizeRole(role));
}

export function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

export function getSafePostAuthPath(requestedPath, role) {
  const normalizedRole = normalizeRole(role);
  const roleHome = getRoleHome(normalizedRole);
  if (
    typeof requestedPath !== "string" ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.includes("\\")
  ) {
    return roleHome;
  }

  let destination;
  try {
    destination = new URL(requestedPath, "http://restora.local");
  } catch {
    return roleHome;
  }

  if (
    destination.origin !== "http://restora.local" ||
    getRoleFromPath(destination.pathname) !== normalizedRole
  ) {
    return roleHome;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
