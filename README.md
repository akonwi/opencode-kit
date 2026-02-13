# @akonwi/opencode-kit

OpenCode plugin package for local workflow notifications and runtime toggles.

## Features

- Idle notification with terminal bell and optional speech.
- Error notification with macOS Funk sound and optional speech.
- Runtime config reads from `~/.config/opencode/kit.json`.
- Structured JSON-line logs at `~/.config/opencode/logs/opencode-kit.log`.
- Local control CLI (no AI turn): `oc-kit`.

## Install

```bash
bun add @akonwi/opencode-kit
```

Register the plugin in your OpenCode plugin config by loading `@akonwi/opencode-kit` and the `OpencodeKit` export.

## Config

File: `~/.config/opencode/kit.json`

```json
{
  "bells": {
    "enabled": true,
    "errorSound": "Funk"
  },
  "speech": {
    "enabled": true,
    "maxChars": 220,
    "voice": null
  },
  "debug": {
    "logLevel": "info"
  }
}
```

If the file is missing or invalid, safe defaults are used.

## CLI

```bash
oc-kit bells on
oc-kit bells off
oc-kit bells toggle
oc-kit bells status

oc-kit speech on
oc-kit speech off
oc-kit speech toggle
oc-kit speech status
```

The plugin re-reads `kit.json` at runtime so changes apply without restart.

## Development

```bash
bun install
bun run format
bun run lint
bun run build
```
