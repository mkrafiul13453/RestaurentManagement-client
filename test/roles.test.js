import assert from "node:assert/strict";
import test from "node:test";
import {
  getRoleHome,
  getSafePostAuthPath,
  isRole,
  normalizeRole,
} from "../lib/roles.js";

test("role values are normalized for dashboard routing", () => {
  assert.equal(normalizeRole(" Admin "), "admin");
  assert.equal(getRoleHome("WAITER"), "/waiter");
  assert.equal(isRole("Manager"), true);
});

test("post-auth redirects stay inside the signed-in role workspace", () => {
  assert.equal(getSafePostAuthPath("/admin/tables?status=available", "admin"), "/admin/tables?status=available");
  assert.equal(getSafePostAuthPath("/waiter", "admin"), "/admin");
  assert.equal(getSafePostAuthPath("//example.com/admin", "admin"), "/admin");
  assert.equal(getSafePostAuthPath("/admin\\@example.com", "admin"), "/admin");
});
