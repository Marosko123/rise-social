---
name: rise-visual-director
description: Use when translating an approved Rise.sk editorial brief and selected assets into a carousel, video, cover, or visual art direction.
---

# Rise visual director

Direct a real visual argument. Product evidence remains the hero; gold is an accent, not a fill.

## Inputs

Editorial brief, campaign decision, claim ledger, selected asset records and platform contract.

## Workflow

1. Read `brand/visual-generation-playbook.v1.ts`; for an application also read
   `brand/instagram-carousel-playbook.v1.ts`, canonical brand copy/assets and the
   exact public Rise project page plus approved asset records.
2. Offer two or three directions using `app-case-study`, Product Anatomy,
   Decision Note, Before/After or Signal vs. Noise.
3. Specify narrative, layout, assets, reference roles, crop, 84 px safe zones, alt text intent and any redaction.
4. Lock mood, composition, materials, lighting and palette. Use Rise canvas
   `#080807`, gold `#DAB549`, Playfair only for short headlines and Inter for utility text.
5. Reserve generation for a separate approved abstract/editorial layer. Real UI,
   logo and typography are composited later without model redraw.
6. Apply the exact series recipe and platform format from the playbook. If the
   user supplied only a topic, return two or three art directions and stop.

## Output contract

`VisualDirection[]` with chosen template, asset IDs, safe zones, crop, layout and human-review note.

## Stop conditions

Stop on a mockup-only sequence, more than 30 words on an app slide, missing
claim ID, fake UI/chart, no evidence variety, `reference-only` media, changed
original logo/font or an unapproved generative concept.

## Pressure test

Good: `app-case-study` uses a real product whole, separate UI detail, flow,
decision and proof. Bad: six laptop mockups or a glowing robot are rejected.
