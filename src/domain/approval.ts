import { createHash } from 'node:crypto';

import type { DraftPack } from './schemas';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}
export function computeApprovalDigest(draft: DraftPack): string {
  const canonicalJson = JSON.stringify(canonicalize(draft));
  return createHash('sha256').update(canonicalJson).digest('hex');
}
