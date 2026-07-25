# Rise Social Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an on-demand local studio that prepares, reviews, exports, and optionally schedules three source-backed Rise.sk social posts.

**Architecture:** A Next.js application owns the review UI and route handlers. Pure TypeScript domain modules own validation, scheduling, approvals, rendering manifests, agent orchestration, exports, and publishing. SQLite stores runs and immutable approval/publishing evidence; Playwright renders the same carousel markup to Instagram images and LinkedIn PDF.

**Tech Stack:** Node.js 24, TypeScript, Next.js, React, Zod, native SQLite, Vitest, Playwright, Buffer GraphQL API, Cloudinary Upload API.

## Global Constraints

- Bind only to `127.0.0.1:4173`.
- Prepare exactly three themes and three platform variants per run.
- Slovak is the source language; claims require public source evidence.
- Codex and Claude alternate author and critic roles.
- No upload or scheduling call may occur before digest-bound browser approval.
- Manual export must work without Buffer or Cloudinary credentials.
- Credentials stay in environment variables or macOS Keychain and never enter prompts or stored runs.

---

### Task 1: Domain contract and durable run store

**Interfaces:** Produce Zod schemas for `ContentRun`, `SourceEvidence`, `DraftPack`, `PlatformPost`, `VisualAsset`, `ApprovalEnvelope`, and `PublishReceipt`; produce `RunRepository`.

- [ ] Write failing schema, schedule, editorial validation, digest, and repository tests.
- [ ] Run the focused tests and confirm failures are caused by missing modules.
- [ ] Implement only the contract and SQLite behavior required by those tests.
- [ ] Run focused tests until green.

### Task 2: Deterministic visual and export pipeline

**Interfaces:** Consume an approved `ContentRun`; produce ordered PNG slides, one LinkedIn PDF per post, captions, alt text, evidence, and a ZIP path.

- [ ] Write failing renderer-manifest and export-layout tests.
- [ ] Confirm the tests fail because rendering/export behavior is absent.
- [ ] Implement shared carousel markup, Playwright capture, PDF generation, and ZIP streaming.
- [ ] Verify focused tests and inspect one generated carousel.

### Task 3: Codex and Claude orchestration

**Interfaces:** Consume a source allowlist and optional brief; produce one validated `DraftPack` after author, critic, and one revision pass.

- [ ] Write failing role-alternation, source-policy, JSON-output, timeout, and validation tests.
- [ ] Confirm expected failures.
- [ ] Implement injected process runners for Codex and Claude and deterministic demo fallback.
- [ ] Verify focused tests with fake runners, then run an opt-in CLI smoke against installed CLIs.

### Task 4: Review application

**Interfaces:** Expose run list/detail, revision, approval, export, metrics, and publishing-preflight route handlers at `http://127.0.0.1:4173`.

- [ ] Write failing component and route-handler tests for approval invalidation and action visibility.
- [ ] Confirm expected failures.
- [ ] Implement responsive review cards, carousel controls, evidence, schedule editing, and 3×3 grid.
- [ ] Verify unit tests and one Chromium desktop/mobile journey.

### Task 5: Optional approved publisher

**Interfaces:** Consume an approved digest and channel configuration; produce nine Buffer drafts/schedules plus exact receipts.

- [ ] Write failing preflight, capacity, upload, idempotency, expired-token, and partial-failure tests.
- [ ] Confirm expected failures.
- [ ] Implement Cloudinary upload and Buffer GraphQL adapters behind injected interfaces.
- [ ] Verify all mocked paths; never call live publishing in automated tests.

### Task 6: CLI, documentation, and complete verification

**Interfaces:** Provide `rise-social prepare`, `review`, `export`, and `schedule`.

- [ ] Write failing CLI parsing and safety-gate tests.
- [ ] Implement commands and user-facing setup documentation.
- [ ] Run unit tests, lint, typecheck, production build, and one Playwright review journey.
- [ ] Start the local server and verify `http://127.0.0.1:4173`.
