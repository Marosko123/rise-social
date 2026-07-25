import { describe, expect, test } from 'vitest';

import { createArchiveManifest } from '@/archive/archiveApprovedRun';
import { createFixtureRun } from './fixtures';

describe('approved content archive', () => {
  test('rejects unapproved and demo-warning runs', () => {
    expect(() => createArchiveManifest(createFixtureRun(false), [], new Date())).toThrow(
      /approved/i,
    );
    const demo = createFixtureRun(true);
    demo.draft.warnings = ['Ukážkový obsah. Pred publikovaním ho upravte.'];
    expect(() => createArchiveManifest(demo, [], new Date())).toThrow(/demo|ukáž/i);
  });

  test('binds the archive to the approved digest and only declared files', () => {
    const run = createFixtureRun(true);
    const manifest = createArchiveManifest(
      run,
      ['01-education/linkedin/carousel.pdf', '01-education/instagram/slide-01.png'],
      new Date('2026-07-24T10:00:00.000Z'),
    );

    expect(manifest.runId).toBe(run.id);
    expect(manifest.digest).toBe(run.approval?.digest);
    expect(manifest.approvedOnly).toBe(true);
    expect(manifest.files).toHaveLength(2);
  });
});
