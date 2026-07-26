---
name: rise-carousel
description: Use when planning, rendering, or reviewing Rise.sk Instagram carousels, LinkedIn PDF documents, Facebook image sequences, covers, slides, alt text, or grid tiles.
---

# Rise carousel

Build text-first carousels with authentic supporting media. For an application,
read `brand/instagram-carousel-playbook.v1.ts` and use `app-case-study`.

## Inputs

Approved brief, claims, selected assets/rights, platform, visual direction and rendered preview.

## Contract

- General templates use 4–8 slides. `app-case-study` uses 7 slides, or 6 only
  when the sourced decision slide is unavailable. All output is 1080×1350.
- Cover gives a concrete promise without clickbait: maximum seven words, two rendered lines,
  approximately 80–96 px. Content headlines use 2–7 words at 54–64 px. Body uses
  8–24 words at 30–36 px. Slide total including up to three 2–4 word callouts
  stays at or below 30 words.
- Use an 84 px safe margin, AA contrast, restrained type and slide numbering.
- LinkedIn PDF pages are flattened and exactly match the Instagram page size.
- Every Instagram grid tile works independently; never build a puzzle grid.
- Prefer product screenshots, UI details, team photos and branded diagrams.
- Write alt text for the information conveyed, not decorative styling.

Choose one master narrative: App Case Study (6–7), Product Anatomy (6), Decision
Note (7), Before/After (6), or Signal vs. Noise (6). App Case Study follows
cover → problem → scope → flow → UI detail → optional decision → evidence. It
requires an approved product whole and a separate functional detail. Vary whole
product, detail, diagram and calm text; never repeat a laptop mockup as every page.

## Output contract

Return template, slide order, dimensions, safe zones, asset IDs/crops, claim mapping and alt text.

Inspect overflow at desktop and mobile review widths before approval.

## Stop conditions

Stop on cropped text, unreadable contrast, missing alt text/claim ID, uncertain
image rights, `reference-only` media, fake/fallback font, altered UI, CSS-drawn
logo, generic stock decoration or generative imagery without explicit approval.

## Pressure test

Good: `app-case-study` alternates approved product whole, flow, pixel-accurate
detail, decision and sourced evidence. Bad: a three-line cover, six generic
notebook frames or an invented screen fails visual QA.
