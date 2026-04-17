import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_CODEX_PATH,
  DEFAULT_LAUNCH_AGENT_PATH,
  DEFAULT_LOG_PATH,
  DEFAULT_OPENCODE_PATH,
} from "./paths.js";

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildPlist({ nodePath, cliPath, codexPath, opencodePath, logPath }) {
  const args = [nodePath, cliPath, "watch", "--codex-path", codexPath, "--opencode-path", opencodePath]
    .map((value) => `    <string>${escapeXml(value)}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>io.junier.codex-opencode-bridge</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${escapeXml(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(logPath)}</string>
</dict>
</plist>
`;
}

export async function installLaunchAgent({
  plistPath = DEFAULT_LAUNCH_AGENT_PATH,
  logPath = DEFAULT_LOG_PATH,
  codexPath = DEFAULT_CODEX_PATH,
  opencodePath = DEFAULT_OPENCODE_PATH,
} = {}) {
  const cliPath = fileURLToPath(new URL("./cli.js", import.meta.url));
  const plist = buildPlist({
    nodePath: process.execPath,
    cliPath,
    codexPath,
    opencodePath,
    logPath,
  });

  await mkdir(dirname(plistPath), { recursive: true });
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(plistPath, plist, { mode: 0o644 });
  return { plistPath, logPath };
}

export async function uninstallLaunchAgent({ plistPath = DEFAULT_LAUNCH_AGENT_PATH } = {}) {
  await rm(plistPath, { force: true });
  return { plistPath };
}
