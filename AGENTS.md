# Rise Social Studio

Canonical local studio for source-backed Rise.sk social content. JetBrains YouTrack
project `RISE` owns task state. GitHub owns source code, rules, branding, skills and
only approved content packs. SQLite owns drafts and temporary receipts.

## Required sequence

- Development: intake → plan → human approval → build → tests → independent review → draft PR.
- Content: topic → business brief → risk gate → research → claim ledger → continuity → visual directions → asset rights → draft → platform variants → render → independent critique → one revision → independent validation → human approval → export/schedule approval → measurement.
- Never auto-merge, deploy, publish, comment, like or message.
- Use `.agentic/` as the shared workflow contract and `.agents/skills/` as the skill source.

## Content gates

- Use published Rise pages, approved public updates and current primary sources only.
- Give every factual claim a stable ID, exact source, evidence excerpt, checked date, risk and expiry; expired facts stop.
- Compare topic, title, opening and promised takeaway with imported history before drafting.
- High-risk briefs stop before drafting: client results, metrics, regulated topics,
  competitors, non-public stories, named people and generative imagery.
- Write concrete Slovak in a direct, calm, polite and friendly company voice.
- Route every variant through `rise-linkedin-post`, `rise-instagram-post` or
  `rise-facebook-post`; never reuse one platform caption unchanged.
- Keep software and product delivery dominant. Never invent results, anecdotes or quotes.
- Run one author draft, one independent critique, one author revision and a second independent validation.
- Human approval is required for export; Buffer drafts and scheduling need separate approval.
- Any content, source, visual, crop, rights or generation-provenance edit invalidates approval.

## Safety

- Bind only to `127.0.0.1:4173`.
- Never read or expose `.env*`, SQLite files, exports, browser state, Keychain or credentials.
- Models receive public research text only, never process credentials or local private files.
- YouTrack mutations are dry-run unless `--apply`; `prepare` issue creation is the sole exception.
- Keep Buffer and Cloudinary optional. Manual export must work without them.
- Do not enable paid GitHub, LFS, Buffer or Cloudinary usage.

## Verification

Run `npm run verify`. Before push also run `npm run verify:push`. Use a failing test
before behavior changes. Stop at human review when a live credential, paid feature,
profile edit, schedule or publication would be required.
