# AGENTS.md

This document is for coding agents working in `@akonwi/opencode-kit`.
It captures build/test/lint commands and the repository's code conventions.

## Project Overview

- Package: `@akonwi/opencode-kit`
- Runtime: Node.js `>=18`
- Language: TypeScript (strict)
- Module system: ESM (`"type": "module"`)
- Build tool: `tsup`
- Lint/format: `Biome`
- Primary outputs: `dist/plugin.js`, `dist/cli.js`, and declarations

## Repository Layout

- `src/plugin.ts`: OpenCode plugin entry (`OpencodeKit`)
- `src/cli.ts`: CLI binary logic for `oc-kit`
- `src/config.ts`: config schema, sanitization, IO, updates
- `src/features/sounds.ts`: bells + idle speech + error sound behavior
- `src/features/logging.ts`: structured local JSON-line logger
- `src/features/handoff.ts`: `/handoff` command orchestration
- `tsup.config.ts`: bundle/declaration config
- `biome.json`: formatter/linter/import sorting rules

## Install And Bootstrap

- Install dependencies: `bun install`
- Ensure local config directory exists when testing runtime behavior:
  - `~/.config/opencode/`
  - `~/.config/opencode/logs/`

## Build, Lint, Format, Check

- Build once: `bun run build`
- Build in watch mode: `bun run dev`
- Lint: `bun run lint`
- Format: `bun run format`
- Full local verification: `bun run check`
  - Current definition: lint + build

## Test Commands

There is currently **no test runner configured** and no `test` script in `package.json`.

- Run all tests: not available yet
- Run a single test: not available yet

If you add tests, also add scripts to `package.json` and update this file.
Recommended minimal future pattern:

- `bun run test` for full suite
- `bun run test -- <path-to-test-file>` for a single test file

Do not invent test commands in PRs without adding the corresponding script.

## Command Execution Expectations For Agents

- Prefer `bun run lint && bun run build` before finishing substantial edits.
- Run `bun run format` only when needed (or if lint/format check requires it).
- Do not treat generated `dist/` files as source-of-truth for style decisions.
- Keep source edits in `src/` and config files.

## Cursor And Copilot Rules

Checked locations:

- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

Current status: no Cursor or Copilot rule files exist in this repository.

If these files are added later, update this section and follow them as higher-priority local rules.

## TypeScript Standards

- Keep `strict`-safe code; avoid weakening compiler options.
- Prefer explicit return types on exported functions.
- Use narrow unions for domain values (e.g., `LogLevel`, `Topic`, `Action`).
- Validate unknown input with type guards before use.
- Avoid `any`; use `unknown` + safe narrowing.
- Prefer `interface` for structured object contracts and `type` for unions/literals.

## Imports And Module Conventions

- Use ESM imports only.
- Use `node:` protocol for Node built-ins (`node:fs/promises`, `node:os`, etc.).
- Keep type-only imports explicit with `import type`.
- Let Biome organize import ordering; do not manually fight formatter output.
- Use relative internal imports from `src/` modules.

## Formatting And Style

- Biome is authoritative for formatting and linting.
- Indentation: 2 spaces.
- Line width target: 100.
- Use trailing commas where formatter inserts them.
- Use double quotes in TS/JS source.
- Favor small helper functions for non-trivial normalization/sanitization logic.

## Naming Conventions

- `camelCase` for variables/functions.
- `PascalCase` for interfaces/types/classes and plugin export names.
- `UPPER_SNAKE_CASE` for module-level constants.
- Use descriptive event names and log event keys (e.g., `idle.notify`, `error.notify`).
- Keep CLI enums literal and explicit (no hidden aliases unless required).

## Error Handling Philosophy

- This project favors graceful degradation for local-notification features.
- Wrap platform/tooling side effects (`say`, `afplay`, file appends) in `try/catch`.
- Avoid crashing plugin execution for optional capability failures.
- Log operational failures with context via logger.
- For config read/parse issues, fall back to sanitized defaults.
- For writes, use safer patterns (temp file + rename).

## Config And Runtime Behavior

- Canonical config file: `~/.config/opencode/kit.json`.
- Read config at runtime on relevant events/CLI actions so toggles apply immediately.
- Keep defaults conservative and explicit in `DEFAULT_CONFIG`.
- Sanitize all user-edited config fields before use.
- Preserve current top-level shape:
  - `bells.enabled`
  - `speech.enabled`
  - `speech.maxChars`
  - `speech.voice`
  - `debug.logLevel`

## Logging Conventions

- Local log file: `~/.config/opencode/logs/opencode-kit.log`.
- Log lines are JSON objects (one object per line).
- Include stable fields: timestamp, level, event, message, optional context.
- Keep context concise and serializable.
- Do not throw on log write failure.

## Plugin Event Handling Conventions

- Use plugin hooks consistent with `@opencode-ai/plugin` API.
- Cache assistant text by session/message to support idle summaries.
- Avoid repeated speech for the same message in one session.
- Guard event branches explicitly by `event.type` and return early.
- Keep behavior platform-aware (macOS-specific tools should fail safely elsewhere).

## CLI Conventions

- Binary name: `oc-kit`.
- Commands currently supported:
  - `oc-kit bells on|off|toggle|status`
  - `oc-kit speech on|off|toggle|status`
- Print concise, parseable status lines.
- Exit with non-zero code for invalid usage.

## Handoff Conventions

- `/handoff` is implemented via plugin command hook (`command.execute.before`).
- Handoff flow should:
  - capture source session id
  - gather compact source context
  - create a new session via session API
  - submit a seeded prompt with user next-prompt + compact context + source session id
  - open TUI session selector to help user switch immediately
- Use OpenCode default session storage; do not write custom export files for now.

## Change Management For Agents

- Prefer minimal, targeted diffs.
- Do not add new heavy dependencies without clear need.
- Keep README and AGENTS docs in sync with behavior changes.
- If adding tests, add scripts and document exact single-test command here.
- Before finishing, run lint + build and report any remaining limitations.
