import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = mkdtempSync(join(tmpdir(), "atw-release-env-"));
after(() => rmSync(cwd, { recursive: true, force: true }));
const baseEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_")),
);
const valid = {
  VITE_SITE_URL: "https://staging.example",
  VITE_SUPABASE_URL: "https://staging-test.supabase.co",
  VITE_SUPABASE_ANON_KEY: "sb_publishable_test_public_key_0123456789",
};
function check(values) {
  return spawnSync(process.execPath, [
    fileURLToPath(new URL("./check-release-env.mjs", import.meta.url)),
    "staging",
  ], {
    cwd,
    env: { ...baseEnv, ...values },
    encoding: "utf8",
  });
}

test("release config accepts a configured environment and refuses missing required values", () => {
  assert.equal(check(valid).status, 0);
  assert.equal(check({}).status, 1);
});

test("release config rejects secret browser keys without printing their values", () => {
  const result = check({
    ...valid,
    VITE_SUPABASE_SERVICE_ROLE_KEY: "private-value-never-log",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /server-only/);
  assert.doesNotMatch(result.stderr, /private-value-never-log/);
});

test("release config rejects form endpoints belonging to another environment", () => {
  assert.equal(
    check({
      ...valid,
      VITE_CONTACT_FORM_ENDPOINT:
        "https://production.supabase.co/functions/v1/contact",
    }).status,
    1,
  );
});
