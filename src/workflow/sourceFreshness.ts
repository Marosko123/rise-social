export type ClaimRisk = 'stable' | 'current' | 'fast-moving';

export interface FreshClaimLedgerEntry {
  id: string;
  sourceId: string;
  sourceUrl: string;
  claim: string;
  evidence: string;
  checkedAt: string;
  risk: ClaimRisk;
  expiresAt: string;
}

export interface LedgerSourceBinding {
  id: string;
  url: string;
}

const MAX_VALIDITY_MS: Record<ClaimRisk, number> = {
  stable: 366 * 24 * 60 * 60 * 1_000,
  current: 31 * 24 * 60 * 60 * 1_000,
  'fast-moving': 7 * 24 * 60 * 60 * 1_000,
};

function normalizedUrl(value: string): string {
  const parsed = new URL(value);
  parsed.hash = '';
  return parsed.href.replace(/\/$/u, '');
}

function parsedDate(value: string, field: string, claimId: string): number {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error(`Claim ${claimId} has an invalid ${field}.`);
  return timestamp;
}

/** Enforces source binding and risk-based claim expiry before a draft can use a fact. */
export function assertFreshClaimLedger(
  claims: readonly FreshClaimLedgerEntry[],
  sources: readonly LedgerSourceBinding[],
  now = new Date(),
): void {
  const sourceUrls = new Map(sources.map(source => [source.id, normalizedUrl(source.url)]));
  const ids = new Set<string>();
  for (const claim of claims) {
    if (!claim.id.trim() || ids.has(claim.id)) throw new Error(`Claim IDs must be stable and unique: ${claim.id}.`);
    ids.add(claim.id);
    if (!claim.evidence.trim()) throw new Error(`Claim ${claim.id} has no evidence excerpt.`);
    const expectedSourceUrl = sourceUrls.get(claim.sourceId);
    if (!expectedSourceUrl || normalizedUrl(claim.sourceUrl) !== expectedSourceUrl) {
      throw new Error(`Claim ${claim.id} is not bound to its exact approved source.`);
    }
    const checkedAt = parsedDate(claim.checkedAt, 'checkedAt', claim.id);
    const expiresAt = parsedDate(claim.expiresAt, 'expiresAt', claim.id);
    if (expiresAt <= checkedAt) throw new Error(`Claim ${claim.id} expires before it was checked.`);
    if (expiresAt - checkedAt > MAX_VALIDITY_MS[claim.risk]) {
      throw new Error(`Claim ${claim.id} exceeds the permitted ${claim.risk} review window.`);
    }
    if (now.getTime() >= expiresAt) throw new Error(`Claim ${claim.id} is expired and must be rechecked.`);
  }
}
