import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_CODEX_PATH = join(homedir(), ".codex", "auth.json");
export const DEFAULT_OPENCODE_PATH = join(homedir(), ".local", "share", "opencode", "auth.json");
export const DEFAULT_LAUNCH_AGENT_PATH = join(
  homedir(),
  "Library",
  "LaunchAgents",
  "io.junier.codex-opencode-bridge.plist",
);
export const DEFAULT_LOG_PATH = join(homedir(), "Library", "Logs", "codex-opencode-bridge.log");
