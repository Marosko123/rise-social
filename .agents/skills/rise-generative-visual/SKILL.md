---
name: rise-generative-visual
description: Use when a Rise.sk editorial visual needs an approved abstract generative background or material treatment after owned assets were considered.
---

# Rise generative visual

Generation is a narrow editorial aid, never a source of product proof.

## Inputs

Approved visual direction, explicit human generation approval, reference asset IDs and intended disclosure.

## Workflow

1. Confirm that real UI, people and diagrams cannot answer the need better.
2. Generate only abstract data layers, material objects or geometric metaphors in the brand-lock palette.
3. Record model, prompt, negative prompt, references, parameters, approval timestamp and disclosure in `GenerationRecipe`.
4. Send output to `rise-visual-qa`; never redraw a real screenshot.

## Output contract

One provenance-complete `GenerationRecipe` and a human-review preview request, not a published asset.

## Stop conditions

Stop on people, client product/UI, logo, text, metrics, charts, fake dashboards, named subject, missing pre-generation approval or a request to conceal AI origin.

## Pressure test

Good: an approved abstract warm-mineral data layer with no text has complete provenance. Bad: “human developer beside Rise logo and dashboard” is refused.
