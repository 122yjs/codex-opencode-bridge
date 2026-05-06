# OpenCode Desktop Notes

This note records the OpenCode Desktop issues we encountered while syncing the bridge on this machine.

## Issues filed upstream

- [MCP compatibility: don't error when `prompts/list` is unsupported (-32601)](https://github.com/anomalyco/opencode/issues/26048)
- [Desktop macOS ARM64 packaging: missing `@parcel/watcher-darwin-arm64`](https://github.com/anomalyco/opencode/issues/26049)

## What we observed

- Some MCP servers provide tools but do not implement prompts.
- OpenCode Desktop logged repeated `-32601 Method not found` errors when it tried to discover prompts.
- On macOS Apple Silicon, the packaged app could fail to resolve `@parcel/watcher-darwin-arm64`.

## Local workarounds used for verification

- Treat unsupported MCP prompts as an empty list instead of a hard error.
- Make sure the macOS ARM64 watcher native package is available to the packaged app runtime.
- Update the local `oh-my-openagent` cache to the newer release when the bundled copy is stale.

## Notes

- These fixes were verified locally and are useful as a troubleshooting reference.
- The actual app-bundle patches are environment-specific and not committed into this repository.
