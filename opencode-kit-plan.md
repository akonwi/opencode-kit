# opencode-kit Plan

## Goal
Create a new, standalone OpenCode plugin package named `@akonwi/opencode-kit` that encapsulates personal OpenCode workflow behavior, starting with sound/speech notifications and runtime toggles.

## Core Decisions
- Package name: `@akonwi/opencode-kit`
- Plugin export: `OpencodeKit`
- CLI binary: `oc-kit`
- Dedicated config file: `~/.config/opencode/kit.json`
- Dedicated log file: `~/.config/opencode/logs/opencode-kit.log`
- No migration/backward compatibility required (brand new package)

## Initial Feature Scope (v1)
1. Session idle notification:
   - terminal bell (configurable on/off)
   - optional speech summary (configurable on/off)
2. Session error notification:
   - macOS Funk sound
   - optional spoken error message
3. Runtime config reads:
   - plugin reads `kit.json` at runtime (no restart required for toggles)
4. Debug instrumentation:
   - structured app logging
   - local JSON-line log file
   - optional TUI debug toasts
5. Local CLI control (no AI turn):
   - `oc-kit sounds on|off|toggle|status`
   - `oc-kit speech on|off|toggle|status`

## Proposed Config Schema (`kit.json`)
```json
{
  "sounds": {
    "enabled": true,
    "idleBell": true,
    "errorSound": "Funk",
    "speech": {
      "enabled": true,
      "maxChars": 220,
      "voice": null
    }
  },
  "debug": {
    "toasts": true,
    "logLevel": "info"
  }
}
```

## Package Structure
- `src/plugin.ts` - plugin entry + hook wiring
- `src/config.ts` - read/validate/default `kit.json`
- `src/features/sounds.ts` - idle/error sound + speech logic
- `src/features/logging.ts` - structured + local logging helpers
- `src/features/toasts.ts` - debug toast helper
- `src/cli.ts` - `oc-kit` command implementation
- `package.json` - metadata, exports, bin, scripts
- `README.md` - install/config/usage docs
- `LICENSE` - MIT
- `tsconfig.json` + build config (tsup or tsc)

## Implementation Steps
1. Scaffold package repo and TypeScript build.
2. Implement config loader for `~/.config/opencode/kit.json` with safe defaults.
3. Implement logging/toast utilities.
4. Implement sounds feature module.
5. Wire plugin hooks:
   - cache assistant text from message events
   - speak summary on `session.idle`
   - play Funk + speech on `session.error`
6. Implement CLI:
   - parse subcommands
   - mutate/read `kit.json`
   - print concise status output
7. Add docs with install and usage examples.
8. Validate manually in OpenCode:
   - idle path
   - error path
   - CLI toggles with no restart
9. Prepare for npm publish (`@akonwi/opencode-kit`).

## Acceptance Criteria
- Plugin loads from npm package and runs without local hacks.
- Sounds/speech behavior works on macOS.
- Speech and sounds toggles apply immediately after `oc-kit` command runs.
- Logs are written to `~/.config/opencode/logs/opencode-kit.log`.
- README is sufficient for first-time install/use.

## Risks / Notes
- macOS-specific commands (`say`, `afplay`) should fail gracefully.
- TUI toasts may not always be visible depending on UI context; logs remain source of truth.
- Keep default behavior conservative and configurable.
