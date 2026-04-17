#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { syncAuthFiles } from "./bridge.js";
import { installLaunchAgent, uninstallLaunchAgent } from "./launch-agent.js";
import {
  DEFAULT_CODEX_PATH,
  DEFAULT_LAUNCH_AGENT_PATH,
  DEFAULT_LOG_PATH,
  DEFAULT_OPENCODE_PATH,
} from "./paths.js";
import { watchCodexAuth } from "./watch.js";

const execFileAsync = promisify(execFile);

function printUsage() {
  console.log(`Usage:
  codex-opencode-bridge sync [--codex-path PATH] [--opencode-path PATH]
  codex-opencode-bridge watch [--codex-path PATH] [--opencode-path PATH]
  codex-opencode-bridge install-launch-agent [--plist-path PATH] [--log-path PATH]
  codex-opencode-bridge uninstall-launch-agent [--plist-path PATH]
  codex-opencode-bridge status [--codex-path PATH] [--opencode-path PATH]`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2] ?? "status",
    codexPath: DEFAULT_CODEX_PATH,
    opencodePath: DEFAULT_OPENCODE_PATH,
    plistPath: DEFAULT_LAUNCH_AGENT_PATH,
    logPath: DEFAULT_LOG_PATH,
  };

  for (let index = 3; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument: ${key ?? ""}`);
    }

    const normalizedKey = key.slice(2);
    if (normalizedKey === "codex-path") args.codexPath = value;
    else if (normalizedKey === "opencode-path") args.opencodePath = value;
    else if (normalizedKey === "plist-path") args.plistPath = value;
    else if (normalizedKey === "log-path") args.logPath = value;
    else throw new Error(`Unknown option: ${key}`);

    index += 1;
  }

  return args;
}

function log(message) {
  console.log(`[codex-opencode-bridge] ${message}`);
}

async function runLaunchctl(args) {
  await execFileAsync("launchctl", args);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.command === "sync") {
    const result = await syncAuthFiles({
      codexPath: args.codexPath,
      opencodePath: args.opencodePath,
      logger: log,
    });
    process.exitCode = result.changed ? 0 : 0;
    return;
  }

  if (args.command === "watch") {
    const watcher = await watchCodexAuth({
      codexPath: args.codexPath,
      opencodePath: args.opencodePath,
      logger: log,
    });

    const shutdown = () => {
      watcher.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    log("Watching for Codex auth changes");
    return;
  }

  if (args.command === "install-launch-agent") {
    const { plistPath, logPath } = await installLaunchAgent({
      plistPath: args.plistPath,
      logPath: args.logPath,
      codexPath: args.codexPath,
      opencodePath: args.opencodePath,
    });
    await runLaunchctl(["unload", plistPath]).catch(() => {});
    await runLaunchctl(["load", "-w", plistPath]);
    log(`LaunchAgent installed at ${plistPath}`);
    log(`Logs will be written to ${logPath}`);
    return;
  }

  if (args.command === "uninstall-launch-agent") {
    await runLaunchctl(["unload", args.plistPath]).catch(() => {});
    await uninstallLaunchAgent({ plistPath: args.plistPath });
    log(`LaunchAgent removed from ${args.plistPath}`);
    return;
  }

  if (args.command === "status") {
    console.log(JSON.stringify({
      codexPath: args.codexPath,
      opencodePath: args.opencodePath,
      plistPath: args.plistPath,
      logPath: args.logPath,
    }, null, 2));
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    `[codex-opencode-bridge] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
