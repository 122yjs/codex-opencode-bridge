import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOpencodeOpenAiAuth,
  mergeOpenAiAuth,
  decodeJwtPayload,
  syncAuthFiles,
} from "../src/bridge.js";

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("buildOpencodeOpenAiAuth maps codex auth into opencode oauth shape", () => {
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = createJwt({ exp: expiresAtSeconds });

  const result = buildOpencodeOpenAiAuth({
    tokens: {
      access_token: accessToken,
      refresh_token: "refresh-token",
      account_id: "account-123",
    },
  });

  assert.equal(result.type, "oauth");
  assert.equal(result.access, accessToken);
  assert.equal(result.refresh, "refresh-token");
  assert.equal(result.accountId, "account-123");
  assert.equal(result.expires, expiresAtSeconds * 1000);
});

test("decodeJwtPayload returns null for invalid JWT", () => {
  assert.equal(decodeJwtPayload("not-a-jwt"), null);
});

test("mergeOpenAiAuth preserves other provider entries", () => {
  const merged = mergeOpenAiAuth(
    {
      milu: { type: "api", key: "abc" },
      openai: { type: "oauth", access: "old", refresh: "old", expires: 1 },
    },
    {
      type: "oauth",
      access: "new",
      refresh: "new-refresh",
      expires: 2,
      accountId: "acct",
    },
  );

  assert.deepEqual(merged, {
    milu: { type: "api", key: "abc" },
    openai: {
      type: "oauth",
      access: "new",
      refresh: "new-refresh",
      expires: 2,
      accountId: "acct",
    },
  });
});

test("syncAuthFiles writes merged opencode auth file and reports update", async (t) => {
  const { mkdtemp, readFile, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");

  const dir = await mkdtemp(join(tmpdir(), "codexbusi-"));
  const codexPath = join(dir, "codex-auth.json");
  const opencodePath = join(dir, "opencode-auth.json");
  const accessToken = createJwt({ exp: 2_200_000_000 });

  await writeFile(
    codexPath,
    JSON.stringify({
      tokens: {
        access_token: accessToken,
        refresh_token: "refresh-token",
        account_id: "account-123",
      },
    }),
  );
  await writeFile(
    opencodePath,
    JSON.stringify({
      "opencode-go": { type: "api", key: "provider-key" },
    }),
  );

  const result = await syncAuthFiles({ codexPath, opencodePath });
  const saved = JSON.parse(await readFile(opencodePath, "utf8"));

  assert.equal(result.changed, true);
  assert.equal(saved["opencode-go"].key, "provider-key");
  assert.equal(saved.openai.accountId, "account-123");
  assert.equal(saved.openai.refresh, "refresh-token");
});

test("syncAuthFiles is a no-op when target content already matches", async () => {
  const { mkdtemp, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");

  const dir = await mkdtemp(join(tmpdir(), "codexbusi-"));
  const codexPath = join(dir, "codex-auth.json");
  const opencodePath = join(dir, "opencode-auth.json");
  const accessToken = createJwt({ exp: 2_200_000_000 });

  const codex = {
    tokens: {
      access_token: accessToken,
      refresh_token: "refresh-token",
      account_id: "account-123",
    },
  };
  const opencode = {
    openai: {
      type: "oauth",
      access: accessToken,
      refresh: "refresh-token",
      expires: 2_200_000_000_000,
      accountId: "account-123",
    },
  };

  await writeFile(codexPath, JSON.stringify(codex));
  await writeFile(opencodePath, JSON.stringify(opencode));

  const result = await syncAuthFiles({ codexPath, opencodePath });

  assert.equal(result.changed, false);
});
