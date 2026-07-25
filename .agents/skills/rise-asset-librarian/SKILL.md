---
name: rise-asset-librarian
description: Use when selecting Rise.sk project screenshots, diagrams, team photographs, external media, or visual evidence for social content.
---

# Rise asset librarian

Select evidence before decoration. Prefer owned public product proof over stock or generated imagery.

## Inputs

Approved brief, public asset catalogue, intended platforms, project and proposed crop/redactions.

## Workflow

1. Prefer real product UI, public Rise diagram, approved team photo, new documentation, licensed external media, then approved abstract generation.
2. Record origin, owner, license, project, confidentiality, platform permission, rights reference, quality, crop and redaction status.
3. Choose only renderable records; keep a rights note in the review digest.

## Output contract

Selected `AssetRecord[]`, rejected candidates with reason, rights summary and crop/redaction instructions.

## Stop conditions

Stop on confidential/pending-redaction assets, missing license confirmation, unapproved client visuals, private paths, altered client UI, or a visual unrelated to the claim.

## Pressure test

Good: approved Rise UI with a documented crop is selectable. Bad: a public-looking client screenshot without cross-platform permission is rejected, not assumed licensed.
