import { describe, expect, test } from 'vitest';

import {
  syncRunToBoard,
  type BoardGateway,
  type BoardIssue,
} from '@/board/syncRunToBoard';
import { createFixtureRun } from './fixtures';

class FakeBoardGateway implements BoardGateway {
  issue?: BoardIssue;
  createCalls = 0;
  addCalls = 0;
  failAdd = false;

  async findByRunId(): Promise<BoardIssue | undefined> {
    return this.issue;
  }

  async createIssue(runId: string): Promise<BoardIssue> {
    this.createCalls += 1;
    this.issue = {
      id: 'RISE-42',
      provider: 'youtrack',
      url: 'https://rise.youtrack.cloud/issue/RISE-42',
      runId,
    };
    return this.issue;
  }

  async attachToBoard(): Promise<{ boardUrl: string }> {
    this.addCalls += 1;
    if (this.failAdd) throw new Error('Project is temporarily unavailable.');
    return { boardUrl: 'https://rise.youtrack.cloud/agiles/204-1/current' };
  }
}

describe('YouTrack board synchronization', () => {
  test('is a dry run unless apply is explicitly enabled', async () => {
    const gateway = new FakeBoardGateway();
    const result = await syncRunToBoard(createFixtureRun(false), gateway, {
      apply: false,
      now: new Date('2026-07-24T08:00:00.000Z'),
    });

    expect(gateway.createCalls).toBe(0);
    expect(result.receipt.status).toBe('pending');
    expect(result.receipt.dryRun).toBe(true);
  });

  test('creates one issue and reuses it on an idempotent retry', async () => {
    const gateway = new FakeBoardGateway();
    const first = await syncRunToBoard(createFixtureRun(false), gateway, {
      apply: true,
      now: new Date('2026-07-24T08:00:00.000Z'),
    });
    const second = await syncRunToBoard(createFixtureRun(false), gateway, {
      apply: true,
      now: new Date('2026-07-24T08:01:00.000Z'),
    });

    expect(gateway.createCalls).toBe(1);
    expect(gateway.addCalls).toBe(2);
    expect(first.receipt.status).toBe('synced');
    expect(second.boardLink?.issueId).toBe('RISE-42');
    expect(second.boardLink?.provider).toBe('youtrack');
    expect(second.receipt.idempotencyKey).toBe(first.receipt.idempotencyKey);
  });

  test('keeps the issue link and reports a partial project failure', async () => {
    const gateway = new FakeBoardGateway();
    gateway.failAdd = true;
    const result = await syncRunToBoard(createFixtureRun(false), gateway, {
      apply: true,
      now: new Date('2026-07-24T08:00:00.000Z'),
    });

    expect(result.boardLink?.issueId).toBe('RISE-42');
    expect(result.receipt.status).toBe('partial');
    expect(result.receipt.error).toMatch(/temporarily unavailable/i);
  });
});
