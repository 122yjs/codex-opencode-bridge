import { watchFile, unwatchFile } from "node:fs";

import { syncAuthFiles } from "./bridge.js";

export async function watchCodexAuth({
  codexPath,
  opencodePath,
  intervalMs = 1000,
  logger = () => {},
} = {}) {
  let syncing = false;
  let pending = false;

  async function runSync(reason) {
    if (syncing) {
      pending = true;
      return;
    }

    syncing = true;
    try {
      logger(`Sync triggered (${reason})`);
      await syncAuthFiles({ codexPath, opencodePath, logger });
    } catch (error) {
      logger(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      syncing = false;
      if (pending) {
        pending = false;
        await runSync("queued");
      }
    }
  }

  await runSync("startup");

  const listener = (current, previous) => {
    if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size) {
      void runSync("file-change");
    }
  };

  watchFile(codexPath, { interval: intervalMs }, listener);

  return {
    close() {
      unwatchFile(codexPath, listener);
    },
  };
}
