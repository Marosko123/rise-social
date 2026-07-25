import { describe, expect, test } from 'vitest';

import { createDemoRun } from '@/demo/createDemoRun';

describe('createDemoRun', () => {
  test('creates the same valid public demo for the same canonical time', () => {
    const now = new Date('2026-07-24T08:00:00.000Z');

    const first = createDemoRun(now);
    const second = createDemoRun(new Date(now));

    expect(first).toEqual(second);
    expect(first.id).toBe('rise-demo-v2-20260724');
    expect(first.status).toBe('draft');
    expect(first.createdAt).toBe('2026-07-24T08:00:00.000Z');
    expect(first.updatedAt).toBe(first.createdAt);
    expect(first.approval).toBeUndefined();
    expect(first.publishReceipt).toBeUndefined();
    expect(first.draft.posts).toHaveLength(3);
  });
});
