---
name: rise-asset-librarian
description: Use when selecting Rise.sk project screenshots, diagrams, team photographs, external media, or visual evidence for social content.
---

# Rise asset librarian

Select evidence before decoration. Prefer owned public product proof over stock or generated imagery.

## Inputs

Approved brief, public asset catalogue, intended platforms, project and proposed crop/redactions.

## Workflow

1. Read `brand/visual-generation-playbook.v1.ts`. For `app-case-study`, also
   read `brand/instagram-carousel-playbook.v1.ts`, `/brand-assets.json` and
   `/brand-copy.json`. In public ChatGPT context, read `/visual-playbook.json`
   and `/visual-assets.json` from Rise Social Studio.
2. Open the exact public Rise case study, then match candidates to stable catalogue
   asset IDs. A portfolio thumbnail alone is not project evidence.
3. Prefer real product UI, public Rise diagram, approved team photo, new
   documentation, licensed external media, then approved abstract generation.
4. Record origin, owner, license, source URL, project, confidentiality, platform
   permission, rights reference, quality, crop and redaction status.
5. Give every image reference a declared role: content evidence, protected UI,
   composition reference or abstract style reference.
6. Choose only renderable records; keep a rights note in the review digest.
7. Treat `reference-only` as art-direction context and `blocked` as unusable.
   Only `approved` assets may be proposed for their listed platforms.
8. For original Rise logos and fonts, verify the stable ID and SHA-256 from
   `/brand-assets.json`. Never copy a client screenshot into public storage
   merely because it appears on a public case study.

## Output contract

Selected `AssetRecord[]`, rejected candidates with reason, rights summary and crop/redaction instructions.

## Stop conditions

Stop on confidential/pending-redaction assets, missing license confirmation,
unapproved client visuals, private paths, hash drift, altered client UI/logo,
or a visual unrelated to the claim.

## Pressure test

Good: approved Rise UI with a hash, focal point and preserve crop is selectable
for `app-case-study`. Bad: a public-looking client screenshot without
cross-platform permission is rejected, not assumed licensed.
