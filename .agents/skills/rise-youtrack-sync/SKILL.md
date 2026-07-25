---
name: rise-youtrack-sync
description: Use when creating or synchronizing Rise Social Studio content runs, task status, approvals, run IDs, retries, offline state, or partial failures with the JetBrains YouTrack RISE project.
---

# Rise YouTrack sync

YouTrack project `RISE` owns task state. GitHub owns source code and approved
artifacts; SQLite owns local drafts and temporary receipts.

## Workflow

1. Search the issue description for the exact Run ID before creating anything.
2. Use the deterministic run idempotency key.
3. Preview a manual mutation unless `--apply`; automatic issue creation during
   `prepare` is the explicit exception.
4. Create the issue inside `RISE` and keep its local review URL in the description.
5. Persist `synced`, `pending` or `partial` with the exact YouTrack URL and error.
6. Map approval and agent stages only when the project exposes the verified fields.

Use `https://rise.youtrack.cloud`. Credentials stay in Keychain, OAuth or process
environment and never enter prompts, logs, SQLite or tracked files.

## Stop conditions

Stop on another project, ambiguous Run IDs, missing required custom fields, cross-
project permissions, a partial mutation or any request to delete issues or bypass a
human gate.
