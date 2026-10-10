import assert from "node:assert/strict";
import test from "node:test";
import { getProvider, MissingApiKeyError, resolveApiKey } from "./index";

test("resolves each supported provider explicitly", () => {
  assert.equal(typeof getProvider("anthropic").generate, "function");
  assert.equal(typeof getProvider("gemini").generate, "function");
  assert.equal(typeof getProvider("openai").generate, "function");
});

test("rejects unknown providers instead of silently falling back", () => {
  assert.throws(() => getProvider("local"), /Unknown AI provider: local/);
});

test("requires a user-supplied key and trims it", () => {
  assert.equal(resolveApiKey("  user-key  "), "user-key");
  assert.throws(() => resolveApiKey(" "), MissingApiKeyError);
  assert.throws(() => resolveApiKey(undefined), MissingApiKeyError);
});