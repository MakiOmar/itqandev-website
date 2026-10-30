import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_FEATURE_MODULES,
  isFeatureModuleEnabled,
  resolveAdminSettings,
} from "../src/lib/api/feature-modules.ts";

const unreachable = () =>
  Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:8020"));
const forbidden = () =>
  Promise.reject(
    Object.assign(new Error("This action is unauthorized."), { status: 403 }),
  );
const apiResponse = (data) => () => Promise.resolve({ success: true, data });

test("admin settings flags win and disabled modules stay off", async () => {
  const resolved = await resolveAdminSettings(
    apiResponse({
      name: "ULSP",
      features: { projects: false, blog: false, licensing: true },
    }),
    unreachable,
  );
  assert.equal(resolved.source, "settings");
  assert.equal(resolved.payload.name, "ULSP");
  assert.equal(isFeatureModuleEnabled(resolved.features, "projects"), false);
  assert.equal(isFeatureModuleEnabled(resolved.features, "blog"), false);
  assert.equal(isFeatureModuleEnabled(resolved.features, "pages"), true);
  assert.equal(resolved.features.licensing, true);
});

test("roles without manageSettings read the flags from site-meta", async () => {
  const resolved = await resolveAdminSettings(
    forbidden,
    apiResponse({ features: { skills: false } }),
  );
  assert.equal(resolved.source, "site-meta");
  assert.equal(isFeatureModuleEnabled(resolved.features, "skills"), false);
  assert.equal(isFeatureModuleEnabled(resolved.features, "media"), true);
});

test("unreachable backend reports every module off instead of all on", async () => {
  const resolved = await resolveAdminSettings(unreachable, unreachable);
  assert.equal(resolved.source, "unavailable");
  assert.equal(resolved.payload, null);
  for (const key of Object.keys(DEFAULT_FEATURE_MODULES)) {
    assert.equal(isFeatureModuleEnabled(resolved.features, key), false, key);
  }
});

test("a response without features (another server on the API port) counts as unreachable", async () => {
  const resolved = await resolveAdminSettings(
    apiResponse("<!doctype html>"),
    apiResponse({ detail: "Not Found" }),
  );
  assert.equal(resolved.source, "unavailable");
});

test("raw { data } bodies are unwrapped", async () => {
  const resolved = await resolveAdminSettings(
    apiResponse({ data: { features: { services: false } } }),
    unreachable,
  );
  assert.equal(resolved.source, "settings");
  assert.equal(isFeatureModuleEnabled(resolved.features, "services"), false);
});
