---
name: Tauri desktop app in Replit
description: Constraints and patterns when building a Tauri v2 desktop app inside this Replit monorepo.
---

**Rule:** Replit integrations (ElevenLabs, etc.) cannot be used inside a Tauri Windows `.exe` because the app runs on the user's machine, not on Replit's cloud. Always ask the user for their own API keys and store them locally in the app.

**Rule:** The `lumina/` directory is not part of the pnpm workspace (`pnpm-workspace.yaml` only lists `artifacts/*`, `lib/*`, `scripts`). Install its dependencies with:

```bash
cd lumina && pnpm install --ignore-workspace
```

**Rule:** The Replit container does not have `cargo` or the Rust toolchain. Rust compilation validation must happen via the GitHub Actions workflow (`build.yml`) which builds the Windows `.exe`.

**Why:** Attempting to run `cargo check` or `pnpm --filter lumina-desktop` fails. Always rely on the GitHub Actions runner for Windows builds and the user testing the generated `.exe`.

**Rule:** Git pushes from the shell fail with authentication errors. Use the `gitPush` callback in CodeExecution instead.
