# codex-opencode-bridge

`~/.codex/auth.json` changes can be mirrored into `~/.local/share/opencode/auth.json` so OpenCode keeps following the active Codex account selected by tools like `codex-switcher` or `codex-auth`.

## What it does

- Reads the current Codex auth file.
- Converts the active tokens into OpenCode's `openai.oauth` auth shape.
- Preserves the rest of `~/.local/share/opencode/auth.json`.
- Supports one-shot sync and continuous watch mode.
- Can install a macOS `launchd` agent so the bridge runs automatically.

## Runtime behavior

- The bridge updates `~/.local/share/opencode/auth.json` immediately after `~/.codex/auth.json` changes.
- Running `opencode` sessions may keep auth state in memory.
- For interactive long-lived sessions, restart `opencode` to reliably apply a switched account.
- One-shot commands started after the file update (for example, `opencode run ...`) are expected to read the latest auth state at process start.

## Usage

```bash
npm test
node ./src/cli.js sync
node ./src/cli.js watch
node ./src/cli.js install-launch-agent
```

## Local global install

```bash
npm install -g /Users/junier/Documents/Develop/codex-opencode-bridge
codex-opencode-bridge status
```

## npm publish flow

```bash
npm login
npm publish
```

## Commands

```bash
codex-opencode-bridge sync
codex-opencode-bridge watch
codex-opencode-bridge status
codex-opencode-bridge install-launch-agent
codex-opencode-bridge uninstall-launch-agent
```

## Defaults

- Codex auth: `~/.codex/auth.json`
- OpenCode auth: `~/.local/share/opencode/auth.json`
- LaunchAgent: `~/Library/LaunchAgents/io.junier.codex-opencode-bridge.plist`
- Logs: `~/Library/Logs/codex-opencode-bridge.log`
