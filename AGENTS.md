# AGENTS.md

Guide for coding agents working in `ex-autofill`.
Follow this document to keep changes consistent with project behavior.

## Project Snapshot

- Type: Chrome Extension (Manifest V3), plain JavaScript.
- Build system: none (direct source loading in browser).
- Package manager: none (`package.json` is not present).
- Runtime model: content scripts + background service worker + options page + globals on `window`.
- Product objective: autofill only fields that are visible, interactable, and in viewport.

## Rules Files Discovery

Checked for additional agent instruction files:

- `.cursorrules`: not found
- `.cursor/rules/`: not found
- `.github/copilot-instructions.md`: not found

If any are added later, treat them as higher-priority guidance and update this file.

## Repository Layout

- `manifest.json`: permissions and content-script injection order.
- `content/autofill.js`: main autofill pipeline (`runAutofill`).
- `content/content-script.js`: message listener and `Alt + Shift + F` trigger.
- `data/dataset-manager.js`: storage I/O, normalization, defaults/fallback merge.
- `data/random-generator.js`: randomized value generation and uniqueness cache.
- `data/field-detector.js`: semantic field-type detection.
- `utils/visibility.js`: CSS/layout visibility checks.
- `utils/interactable.js`: disabled/covered checks.
- `utils/viewport.js`: in-viewport checks.
- `background/service-worker.js`: action click trigger and error alert fallback.
- `options/options.js`: options actions, status text, dataset editor behavior.
- `options/options.html`: options UI markup.
- `README.md`: user-facing behavior and manual usage notes.

## Build, Lint, Test Commands

No formal toolchain is configured yet.

### Build

- Build command: not required.
- Packaging command: not configured.

### Lint / Format

- Lint command: not configured.
- Format command: not configured.

### Tests

- Automated test command: not configured.
- Run full test suite: not available.
- Run a single test: not available (no test harness is installed).

### Manual Validation (Source of Truth)

Use this flow after behavior changes:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension from repo root.
4. Open a page with forms.
5. Trigger autofill via extension icon click or `Alt + Shift + F`.
6. Confirm status includes `scanned`, `eligible`, `filled`.
7. Confirm hidden/covered/out-of-viewport fields are skipped.
8. Confirm modal-priority behavior when modal/dialog exists.

### Useful Local Sanity Commands

- Validate manifest JSON:
  - `python3 -m json.tool manifest.json >/dev/null`
- Inspect working tree:
  - `git status`
  - `git diff`

## Architecture and Dependency Rules

- `manifest.json` script order is significant; keep dependency order intact.
- Shared APIs are exposed as globals; preserve these namespaces:
  - `window.__autofillUtils`
  - `window.__autofillData`
  - `window.__autofillRandom`
  - `window.__autofillDetector`
  - `window.__autofillExtension`
- Do not migrate runtime scripts to ESM/CJS imports unless architecture is redesigned.
- Avoid bundler assumptions or build-step-only patterns.

## Code Style Guidelines

### Language / Module Model

- Use modern plain JavaScript (no TypeScript).
- Use IIFE module pattern for shared scripts.
- Export public APIs explicitly to `window.__autofill*` only.

### Imports / Dependencies

- Runtime scripts use no `import`/`require`.
- Cross-file dependencies must be expressed by manifest load order + global namespaces.
- New shared file must be added to `manifest.json` in correct order.
- Avoid introducing external runtime dependencies.

### Formatting

- Indentation: 2 spaces.
- Semicolons: required.
- Strings: prefer double quotes.
- Equality: prefer strict (`===`, `!==`).
- Trailing commas: keep existing style in multiline literals.
- Prefer `const`; use `let` only when reassignment is required.
- Prefer early returns to keep branches shallow.

### Naming

- Variables/functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for config-like values.
- Internal helpers: descriptive verbs (`normalizeDatasets`, `getTargetFields`).
- Global API surface: namespaced under `window.__autofill*`.

### Types and Data Shapes

- Preserve object shapes across modules and options/runtime boundaries.
- Dataset shape:
  - `text`, `email`, `company`, `address`, `phone`, `url`: `string[]`
  - `paragraph`: `string`
  - `minWords`, `maxWords`: `number`
- Normalize unknown input before merge/use.
- Keep storage API contracts stable (boolean success when expected).

### Error Handling

- Never allow uncaught errors to escape message handlers.
- Wrap async boundaries in `try/catch` or Promise `.catch`.
- In content-script responses, use `{ ok: false, error }` on failure.
- Options actions must always update status text on success/failure.
- Fail soft with defaults/fallbacks for malformed/missing data.

### DOM and Autofill Behavior

- Operate only on `input`, `textarea`, `select`.
- Skip non-fillable fields (`hidden`, `file`, disabled, readonly where applicable).
- Apply visibility + interactable + viewport filters before filling.
- Keep modal-priority behavior unchanged when dialog selectors match.
- Dispatch both `input` and `change` after mutating values.
- Keep compatibility with SPA frameworks (React/Vue/Angular).

### Security and Privacy

- Do not add telemetry/tracking.
- Do not add remote network calls for autofill logic.
- Keep user dataset storage in `chrome.storage.sync` unless explicitly requested.
- Treat page DOM/content as untrusted input.

## Change Checklist

Before finishing work:

1. Ensure `manifest.json` load order remains valid.
2. Ensure new globals are correctly namespaced.
3. Ensure failure paths return graceful status/messages.
4. Run manual validation on at least one normal form and one modal case.
5. Update `README.md` when behavior or user workflow changes.
