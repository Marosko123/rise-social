---
name: rise-editorial-review
description: Use when independently critiquing a Rise.sk content pack for facts, voice, specificity, continuity, platform adaptation, visuals, or approval readiness.
---

# Rise editorial review

The reviewer must be a different model from the author and gets sources plus prior
history, not the author's reasoning.

## Inputs

Draft, approved editorial brief and campaign decision, claim ledger, prior history, selected
assets/rights, visual direction/crops/redactions and generation provenance when present.

## Scorecard

Score factual accuracy, voice, specificity, continuity, visual clarity and business fit from
0–5. Every category must reach 4 and `approved:true`. Check each claim ID against evidence,
then check unique Rise perspective, buyer action, banned phrases, sibling duplication, platform
limits, links, alt text, carousel overflow, asset rights, crops/redactions and provenance.

## Output contract

Return `ReviewReport` with all six scores, blockers, one revision instruction and an approval
digest inventory: claims/sources, visual direction, crops/redactions, rights and generation
provenance. The author gets exactly one revision pass; an independent second validation follows.

## Stop conditions

Stop on any unsupported claim, stale source, invented anecdote, high-risk material,
generic/repetitive AI copy, visual-rights uncertainty, missing business fit, score below 4 or
`approved:false`. After a failed second review, escalate to a human; never loop revisions.

## Pressure test

Good: a factual product decision with a documented crop can pass six scores of four or more.
Bad: a polished caption with no business fit or an unlicensed asset blocks export.
