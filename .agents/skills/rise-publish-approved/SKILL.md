---
name: rise-publish-approved
description: Use when exporting, archiving, staging, scheduling, reconciling, or cleaning approved Rise.sk social posts through local files, Buffer, or Cloudinary.
---

# Publish approved Rise content

Manual export is the first and always-available route. Remote publishing is optional.

## Workflow

1. Recompute the digest and require matching approval plus revision.
2. Render and inspect the local export.
3. Upload only approved public assets needed by Buffer.
4. Verify three free positions on every channel.
5. Create and inspect Buffer drafts first.
6. Require a new schedule approval, then schedule with idempotency keys.
7. Persist exact receipts; clean Cloudinary media seven days after confirmed publication.

Never expose credentials to a model. Never retry a partial remote state as if atomic.

## Stop conditions

Stop on stale approval, demo warnings, missing capacity, expired credentials, upload
failure, partial scheduling, unverified drafts or any paid-tier requirement.
