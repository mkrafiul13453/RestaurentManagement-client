import assert from "node:assert/strict";
import test from "node:test";
import { getAuthErrorMessage } from "../lib/auth-errors.js";

test("authentication errors explain when the API cannot be reached", () => {
  assert.match(
    getAuthErrorMessage(new TypeError("fetch failed"), "sign-up"),
    /Cannot reach the Restora API/,
  );
  assert.match(
    getAuthErrorMessage({ message: "Failed to fetch" }),
    /Start the server/,
  );
});

test("authentication errors distinguish server outage, credentials, and rate limits", () => {
  assert.match(getAuthErrorMessage({ status: 503 }), /connected to MongoDB/);
  assert.match(getAuthErrorMessage({ status: 401 }), /Email or password is incorrect/);
  assert.match(getAuthErrorMessage({ status: 429 }), /wait a few minutes/);
});

test("safe Better Auth validation messages are preserved", () => {
  assert.equal(
    getAuthErrorMessage({ status: 400, message: "User already exists" }, "sign-up"),
    "User already exists",
  );
});
