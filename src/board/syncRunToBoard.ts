import { createHash } from 'node:crypto';

import {
  BoardLinkSchema,
  BoardSyncReceiptSchema,
  type BoardLink,
  type BoardSyncReceipt,
  type ContentRun,
} from '@/domain/schemas';

export interface BoardIssue {
  id: string;
  provider: 'youtrack' | 'github';
  number?: number;
  url: string;
  runId: string;
}

export interface BoardGateway {
  findByRunId(runId: string): Promise<BoardIssue | undefined>;
  createIssue(runId: string, run: ContentRun): Promise<BoardIssue>;
  attachToBoard(issue: BoardIssue): Promise<{ boardUrl: string }>;
}

export interface BoardSyncResult {
  boardLink?: BoardLink;
  receipt: BoardSyncReceipt;
}

function idempotencyKey(runId: string): string {
  return createHash('sha256').update(`rise-social-board:${runId}`).digest('hex');
}

export async function syncRunToBoard(
  run: ContentRun,
  gateway: BoardGateway,
  options: { apply: boolean; now?: Date },
): Promise<BoardSyncResult> {
  const attemptedAt = (options.now ?? new Date()).toISOString();
  const base = {
    runId: run.id,
    idempotencyKey: idempotencyKey(run.id),
    attemptedAt,
    dryRun: !options.apply,
  };
  if (!options.apply) {
    return {
      receipt: BoardSyncReceiptSchema.parse({ ...base, status: 'pending' }),
    };
  }

  let issue: BoardIssue | undefined;
  try {
    issue = (await gateway.findByRunId(run.id)) ?? (await gateway.createIssue(run.id, run));
  } catch (error) {
    return {
      receipt: BoardSyncReceiptSchema.parse({
        ...base,
        status: 'pending',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  const initialLink = BoardLinkSchema.parse({
    provider: issue.provider,
    issueId: issue.id,
    issueNumber: issue.number,
    issueUrl: issue.url,
  });
  try {
    const board = await gateway.attachToBoard(issue);
    return {
      boardLink: BoardLinkSchema.parse({
        ...initialLink,
        boardUrl: board.boardUrl,
      }),
      receipt: BoardSyncReceiptSchema.parse({ ...base, status: 'synced' }),
    };
  } catch (error) {
    return {
      boardLink: initialLink,
      receipt: BoardSyncReceiptSchema.parse({
        ...base,
        status: 'partial',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
