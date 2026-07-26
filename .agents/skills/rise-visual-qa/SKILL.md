---
name: rise-visual-qa
description: Use when checking Rise.sk carousel pages, cover crops, rendered images, video first frames, alt text, contrast, or AI visual artefacts before human approval.
---

# Rise visual QA

Validate readability and truthfulness before aesthetic polish.

## Inputs

Rendered PNG/PDF/video preview, visual direction, selected assets, provenance, alt text and platform crop.

## Workflow

1. Read `brand/visual-generation-playbook.v1.ts`; for `app-case-study` also read
   `brand/instagram-carousel-playbook.v1.ts`; validate versions, mandatory
   source URLs, exact palette signals, negative prompt and complete prompt
   contract in provenance.
2. Check 1080×1350 output, 84 px safe margin, 6–7 roles, slide number,
   headline/body/callout limits, claim IDs, overflow, WCAG AA contrast and text density.
3. Inspect the full carousel, Instagram 3×3, mobile feed and Facebook/LinkedIn crops.
4. Compare UI/logo/diagram pixel-for-pixel and verify the exact manifest hash;
   confirm Inter and Playfair loaded with no fallback. Inspect AI
   output at 100% for nonsense text, distorted objects, fake data, glossy/cyberpunk
   drift, implausible light and broken contact shadows.
5. Return blockers before approval; video needs captions and a clear silent first frame.
6. Require platform, dimensions, crop, alt text, AI provenance and reference
   asset roles in the result package.

## Output contract

Pass/fail report with asset IDs, crop, findings, alt-text result and required human visual inspection.

## Stop conditions

Stop on missing source manifest/playbook version, wrong `app-case-study` role
order, unreadable or fallback type, unsafe crop, absent alt text/claim ID,
changed logo/UI, perspective transform, rights gap, generated person/text/chart,
brand drift or uninspected video captions.

## Pressure test

Good: a legible `app-case-study` with exact Rise mark, real product whole,
functional detail and 84 px margins passes pending human inspection. Bad:
altered UI, fallback font or AI gibberish blocks approval.
