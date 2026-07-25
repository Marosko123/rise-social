---
name: rise-generative-visual
description: Use when a Rise.sk editorial visual needs an approved abstract generative background or material treatment after owned assets were considered.
---

# Rise generative visual

Generation is a narrow editorial aid, never a source of product proof.

## Inputs

Approved visual direction, explicit human generation approval, reference asset IDs and intended disclosure.

A direct request to “vytvor/generuj obrázok” counts as generation approval only
for that request. A topic or request for a plan does not.

## Workflow

1. Confirm that real UI, people and diagrams cannot answer the need better.
2. Read `brand/visual-generation-playbook.v1.ts`. Open the exact Rise project page,
   approved asset records and current official image/platform sources listed there.
3. Show the human the source manifest, reference roles, art direction, crop, full
   prompt and exclusions before generation.
4. Write the prompt in the playbook order: purpose → source references → subject →
   composition → materials → lighting → brand lock → preserve → exclude → output.
5. Generate only abstract data layers, material objects or geometric metaphors.
   Real UI, logo, text and people are never model output.
6. Record playbook version, source URLs, model, prompt, negative prompt, reference
   asset IDs, parameters, platform, dimensions, crop, alt text, approval timestamp
   and disclosure in `GenerationRecipe`.
7. Send the preview to `rise-visual-qa`; never redraw a real screenshot.

## Output contract

One provenance-complete `GenerationRecipe` using `rise-visual-generation-v1` and
a human-review preview request, not a published asset.

## Stop conditions

Stop on missing public Rise/source references, people, client product/UI, logo,
text, metrics, charts, fake dashboards, named subject, missing pre-generation
approval or a request to conceal AI origin.

## Pressure test

Good: an approved abstract warm-mineral data layer with no text has complete provenance. Bad: “human developer beside Rise logo and dashboard” is refused.
