---
name: rise-topic-intake
description: Use when a user gives Rise.sk a topic, project, audience, goal, source, or requested campaign scope before research or drafting.
---

# Rise topic intake

Turn one request into a business brief. This is planning only; it never grants approval or starts a draft.

## Inputs

Topic, audience, goal, optional project/source, requested mode and generative-visual policy.

## Workflow

1. Name the buyer question, Rise perspective, business fit and desired action.
2. Union explicit and detected risks: client result, metric, regulated matter, competitor, non-public story, named person and generative visual.
3. Default to one post. Hand campaign evidence to `rise-campaign-architect`.
4. Return `EditorialBrief`; mark any risk `pending` for human review.

## Output contract

`TopicRequest`, audience, buyer question, `EditorialBrief`, requested action and risk flags. Keep unknown facts out.

## Stop conditions

Stop before research/drafting when the topic is empty, private, regulated, result-led, named-person-led, or asks for a generative visual without a human checkpoint.

## Pressure test

Good: “MapaTrhu pre majiteľov, consideration” returns one buyer question and no invented claim. Bad: “ukážte klientovi 40 % úsporu” must return `client-result` and `metric`, never a caption.
