---
name: rise-visual-qa
description: Use when checking Rise.sk carousel pages, cover crops, rendered images, video first frames, alt text, contrast, or AI visual artefacts before human approval.
---

# Rise visual QA

Validate readability and truthfulness before aesthetic polish.

## Inputs

Rendered PNG/PDF/video preview, visual direction, selected assets, provenance, alt text and platform crop.

## Workflow

1. Check 1080×1350 output, 84 px safe margin, slide number, title lines, overflow, contrast and text density.
2. Inspect the full carousel, Instagram 3×3, mobile feed and Facebook/LinkedIn crops.
3. Compare UI/logo/diagram with the approved asset; inspect AI output for nonsense text, distorted objects and fake data.
4. Return blockers before approval; video needs captions and a clear silent first frame.

## Output contract

Pass/fail report with asset IDs, crop, findings, alt-text result and required human visual inspection.

## Stop conditions

Stop on unreadable type, unsafe crop, absent alt text, changed logo/UI, rights gap, generated person/text/chart, or uninspected video captions.

## Pressure test

Good: a legible 1080×1350 diagram with 84 px margins passes pending human inspection. Bad: altered UI or AI gibberish blocks approval.
