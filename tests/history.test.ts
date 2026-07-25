import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { parsePriorPosts } from '@/history/importPriorPosts';
import { RunRepository } from '@/storage/runRepository';

describe('prior-post history', () => {
  test('parses JSON and derives a normalized opening', () => {
    const posts = parsePriorPosts(
      JSON.stringify([
        {
          id: 'linkedin-1',
          platform: 'linkedin',
          caption: 'Najprv proces. Potom technológia. #softver',
          publishedAt: '2026-01-02T10:00:00.000Z',
          sourceUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
        },
      ]),
      'history.json',
      new Date('2026-07-24T08:00:00.000Z'),
    );

    expect(posts[0].opening).toBe('najprv proces potom technológia');
    expect(posts[0].importedAt).toBe('2026-07-24T08:00:00.000Z');
  });

  test('imports the same history idempotently into SQLite', () => {
    const directory = mkdtempSync(join(tmpdir(), 'rise-social-history-'));
    const repository = new RunRepository(join(directory, 'studio.sqlite'));
    const posts = parsePriorPosts(
      'id,platform,caption\nfacebook-1,facebook,"Konkrétny pracovný tok bez vaty."',
      'history.csv',
      new Date('2026-07-24T08:00:00.000Z'),
    );

    expect(repository.importPriorPosts(posts)).toBe(1);
    expect(repository.importPriorPosts(posts)).toBe(0);
    expect(repository.listPriorPosts()).toHaveLength(1);
  });
});
