---
name: rise-slovak-human-copy
description: Use when drafting or editing Slovak captions, carousel text, hooks, calls to action, hashtags, links, alt text, or anti-AI wording for Rise.sk.
---

# Slovak human copy

Write one concrete idea in natural Slovak. Vary sentence length. Use the wording a
calm product team would use when explaining real work.

## Inputs

Approved editorial brief, claim IDs, selected platform contract, prior openings and desired action.

## Shape

1. Open with a specific observation or decision, not a generic question.
2. Explain one example or consequence grounded in a claim ID.
3. Close with a useful next step; omit a CTA when none is natural.
4. Adapt each platform independently.

For `app-case-study`, read `brand/instagram-carousel-playbook.v1.ts` and
`brand-copy.json`. Use exact project names and facts: cover 3–7 words, subtitle
8–16, content headline 2–7, body 8–24, slide total at most 30 and callout 2–4.
Each slide carries a claim ID. If evidence is missing, remove the optional
decision slide instead of filling it with generic marketing.

Use 2–5 controlled hashtags on Instagram, 0–3 on LinkedIn and 0–2 on Facebook.
Default to no emoji; use at most one for a real event and never as a bullet.
Use HTTPS. Instagram says `odkaz v profile`; LinkedIn/Facebook link directly only
when visiting the page is the post objective.

Write as a direct, calm, polite and friendly company voice. We may say `my` only about public,
defensible Rise work; never manufacture first-person experience, a client story or a team memory.
Block phrases from `brand/voice.sk.json`, generic engagement bait and invented experience.

## Output contract

Return a platform-specific caption, opening, claim IDs, intended takeaway and link/hashtag decision.

## Stop conditions

Stop on unsupported numbers, false first-person experience, unconfirmed mentions,
missing claim ID, text beyond the `app-case-study` limits, hashtag walls,
AI-like filler or copy that can be swapped to any company unchanged.

## Pressure test

Good: a sourced app problem becomes one short idea per slide. Bad: “S nadšením
prinášame revolučný game-changer z našej skúsenosti” is rejected.
