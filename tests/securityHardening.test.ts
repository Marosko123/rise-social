import { describe, expect, test } from 'vitest';

import { assertRunReadyForApproval } from '@/domain/approvalReadiness';

import { createFixtureRun } from './fixtures';

describe('approval security hardening', () => {
  test('rejects claim evidence at its expiry instant', () => {
    const run = createFixtureRun();
    run.draft.workflowContext!.claimLedger = [
      {
        id: 'claim-expired',
        sourceId: run.draft.sources[0].id,
        sourceUrl: run.draft.sources[0].url,
        claim: 'Tvrdenie, ktoré treba opätovne overiť.',
        evidence: 'Verejný dôkaz.',
        checkedAt: '2026-07-24T08:00:00.000Z',
        risk: 'fast-moving',
        expiresAt: '2026-07-25T08:00:00.000Z',
      },
    ];

    expect(() =>
      assertRunReadyForApproval(
        run,
        new Date('2026-07-25T08:00:00.000Z'),
      ),
    ).toThrow(/expired/i);
  });
});
