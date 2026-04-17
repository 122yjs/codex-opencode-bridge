import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeJwtPayload(token) {
  if (typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

function getExpiryMs(tokens) {
  const payloads = [tokens.access_token, tokens.id_token]
    .map((value) => decodeJwtPayload(value))
    .filter(Boolean);

  for (const payload of payloads) {
    if (typeof payload.exp === "number") {
      return payload.exp * 1000;
    }
  }

  throw new Error("Unable to determine token expiry from Codex auth JWT payload");
}

export function buildOpencodeOpenAiAuth(codexAuth) {
  const tokens = codexAuth?.tokens;
  if (!tokens?.access_token || !tokens?.refresh_token || !tokens?.account_id) {
    throw new Error("Codex auth file is missing required token fields");
  }

  return {
    type: "oauth",
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    expires: getExpiryMs(tokens),
    accountId: tokens.account_id,
  };
}

export function mergeOpenAiAuth(existingAuth, openAiAuth) {
  const next = existingAuth && typeof existingAuth === "object" ? { ...existingAuth } : {};
  next.openai = openAiAuth;
  return next;
}

function toStableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(path, fallbackValue) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return fallbackValue;
    }
    throw error;
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, toStableJson(value), { mode: 0o600 });
  await rename(temporaryPath, path);
}

export async function syncAuthFiles({
  codexPath,
  opencodePath,
  logger = () => {},
} = {}) {
  if (!codexPath || !opencodePath) {
    throw new Error("codexPath and opencodePath are required");
  }

  const codexAuth = await readJson(codexPath, null);
  if (!codexAuth) {
    throw new Error(`Codex auth file not found: ${codexPath}`);
  }

  const nextOpenAiAuth = buildOpencodeOpenAiAuth(codexAuth);
  const currentOpencodeAuth = await readJson(opencodePath, {});
  const mergedAuth = mergeOpenAiAuth(currentOpencodeAuth, nextOpenAiAuth);

  const previousJson = toStableJson(currentOpencodeAuth);
  const nextJson = toStableJson(mergedAuth);
  if (previousJson === nextJson) {
    logger(`No change needed for ${opencodePath}`);
    return { changed: false, opencodeAuth: mergedAuth };
  }

  await writeJsonAtomic(opencodePath, mergedAuth);
  logger(`Updated ${opencodePath} from ${codexPath}`);
  return { changed: true, opencodeAuth: mergedAuth };
}
