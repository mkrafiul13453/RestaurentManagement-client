import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney, parseDollarAmount } from "../lib/money.js";

test("formats minor units as US dollars", () => {
  assert.equal(formatMoney(1250), "$12.50");
  assert.equal(formatMoney(100), "$1.00");
  assert.equal(formatMoney(-50), "-$0.50");
  assert.equal(formatMoney(Number.NaN), "—");
});

test("converts dollar amounts to integer minor units", () => {
  assert.equal(parseDollarAmount("12"), 1200);
  assert.equal(parseDollarAmount("12.5"), 1250);
  assert.equal(parseDollarAmount("12.50"), 1250);
  assert.equal(parseDollarAmount("0.01"), 1);
});

test("rejects invalid or unsupported dollar amounts", () => {
  for (const amount of ["", "0", "0.00", "-1", "1.999", "1e2", "abc", "90071992547410"]) {
    assert.equal(parseDollarAmount(amount), null);
  }
});
