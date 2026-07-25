---
name: rise-social-research
description: Use when researching a Rise.sk social topic, product claim, current software insight, public update, source allowlist, or claim evidence.
---

# Rise social research

Research precedes copy. Prefer published Rise pages and current primary sources.

## Inputs

Approved topic/brief, public source URLs, project registry, current date and any visual candidate.

## Workflow

1. Translate the brief into problem, audience, objective and risk.
2. Search allowlisted Rise sources, then official primary sources needed for context.
3. Check the public project registry before naming a project, client, count, visual or result.
4. Record each factual statement as a stable `claimId`, exact URL, checked date, evidence
   excerpt, risk (`stable`, `current`, `fast-moving`) and risk-based expiry.
5. Record visual origin, owner/license, confidentiality, allowed platforms, rights reference
   and currentness separately; public visibility is not a licence.
6. Separate verified fact, Rise opinion and proposed interpretation.
7. Pass only public evidence text and the ledger to the drafting model.

## Output contract

`ClaimLedger` entries bind every ID to one exact source URL, excerpt, checked date, risk and
expiry; include a project/visual-rights note. Facts past expiry are unusable until rechecked.

Do not use search snippets as evidence. Do not invent a metric, customer outcome,
quote, anecdote or relationship.

## Stop conditions

Stop when a claim has no primary source, a page is private, evidence conflicts,
or the brief is high-risk and lacks human brief approval. Stop on an expired fact,
untracked project count, unlicensed visual or source text that includes credentials/private data.

## Pressure test

Good: a public portfolio statement records its exact URL, excerpt and checked date. Bad: an
old AI trend article or an external project image without rights is blocked rather than paraphrased.
