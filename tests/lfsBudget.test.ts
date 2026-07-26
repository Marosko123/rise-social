import { execFileSync } from 'node:child_process';

import { describe, expect, test } from 'vitest';

describe('Git LFS free-tier guard', () => {
  test('works in both a main checkout and a linked git worktree', () => {
    const output = execFileSync(
      process.execPath,
      ['scripts/check-lfs-budget.mjs'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    expect(output).toContain('Git LFS local objects:');
  });
});
