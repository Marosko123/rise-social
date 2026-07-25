---
name: rise-content-measurement
description: Use when reviewing completed Rise.sk social post performance, formats, clicks, qualified conversations, or the next 90-day content experiment.
---

# Rise content measurement

Measure business signal, then propose one bounded experiment. Analytics never changes publishing or editorial rules by itself.

## Inputs

Platform and format metrics: swipes, saves, shares, clicks, completion, relevant comments, profile/portfolio/contact visits and qualified conversations.

## Workflow

1. Preserve the raw per-platform metric record and UTM context.
2. Compare against the first-90-day baseline and the weakest series, not a platform myth.
3. Propose one test of audience, buyer question, opening, proof or visual format.
4. Ask a human to approve any strategy change; retain the current frequency until then.

## Output contract

Measurement record, interpretation, `proposed` next experiment and explicit `automaticRuleChange:false`.

## Stop conditions

Stop on missing time window/UTM context, vanity-only interpretation, fabricated attribution, or any automatic schedule, targeting or rule change.

## Pressure test

Good: higher saves on a Decision Note proposes one new Decision Note test. Bad: one viral like count never raises cadence automatically.
