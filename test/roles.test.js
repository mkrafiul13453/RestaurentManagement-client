import assert from "node:assert/strict";
import test from "node:test";
import {
  getRoleHome,
  getSafePostAuthPath,
  isRole,
  normalizeRole,
  roleConfig,
} from "../lib/roles.js";

test("role values are normalized for dashboard routing", () => {
  assert.equal(normalizeRole(" Admin "), "admin");
  assert.equal(getRoleHome("WAITER"), "/waiter");
  assert.equal(isRole("Manager"), true);
});

test("customer navigation includes menu, orders, reservations, payments, and notifications", () => {
  assert.deepEqual(
    roleConfig.customer.modules.map(({ href }) => href),
    [
      "/customer/menu",
      "/customer/orders",
      "/customer/reservations",
      "/customer/payments",
      "/customer/notifications",
    ],
  );
});

test("each role has a scoped notification inbox route", () => {
  for (const role of Object.keys(roleConfig)) {
    assert.ok(roleConfig[role].modules.some(({ href }) =>
      href === `/${role}/notifications`
    ));
  }
});

test("reports are available only in the admin and manager navigation", () => {
  assert.ok(roleConfig.admin.modules.some(({ href }) => href === "/admin/reports"));
  assert.ok(roleConfig.manager.modules.some(({ href }) => href === "/manager/reports"));
  for (const role of ["waiter", "chef", "cashier", "customer"]) {
    assert.equal(roleConfig[role].modules.some(({ href }) => href?.endsWith("/reports")), false);
  }
});

test("post-auth redirects stay inside the signed-in role workspace", () => {
  assert.equal(getSafePostAuthPath("/admin/tables?status=available", "admin"), "/admin/tables?status=available");
  assert.equal(getSafePostAuthPath("/waiter", "admin"), "/admin");
  assert.equal(getSafePostAuthPath("//example.com/admin", "admin"), "/admin");
  assert.equal(getSafePostAuthPath("/admin\\@example.com", "admin"), "/admin");
});
