import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { computeApprovalDigest } from '@/domain/approval';
import { assertRunReadyForApproval } from '@/domain/approvalReadiness';
import {
  ApprovalEnvelopeSchema,
  ArchiveManifestSchema,
  BoardSyncReceiptSchema,
  ContentRunSchema,
  PriorPostSchema,
  type ArchiveManifest,
  type BoardLink,
  type BoardSyncReceipt,
  type ContentRun,
  type DraftPack,
  type PriorPost,
  type PublishReceipt,
} from '@/domain/schemas';

interface RunRow {
  payload: string;
}

interface PriorPostRow {
  payload: string;
}

export class RunRepository {
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS content_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prior_posts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
  }

  save(run: ContentRun): ContentRun {
    const validated = ContentRunSchema.parse(run);
    this.database
      .prepare(`
        INSERT INTO content_runs (id, status, updated_at, payload)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          updated_at = excluded.updated_at,
          payload = excluded.payload
      `)
      .run(validated.id, validated.status, validated.updatedAt, JSON.stringify(validated));
    return validated;
  }

  get(id: string): ContentRun | undefined {
    const row = this.database
      .prepare('SELECT payload FROM content_runs WHERE id = ?')
      .get(id) as RunRow | undefined;
    return row ? ContentRunSchema.parse(JSON.parse(row.payload) as unknown) : undefined;
  }

  list(): ContentRun[] {
    const rows = this.database
      .prepare('SELECT payload FROM content_runs ORDER BY updated_at DESC')
      .all() as unknown as RunRow[];
    return rows.map(row => ContentRunSchema.parse(JSON.parse(row.payload) as unknown));
  }

  approve(
    id: string,
    action: 'export' | 'schedule',
    approvedAt = new Date().toISOString(),
  ): ContentRun {
    const current = this.require(id);
    assertRunReadyForApproval(current);
    const approval = ApprovalEnvelopeSchema.parse({
      runId: id,
      digest: computeApprovalDigest(current.draft),
      approvedAt,
      action,
      revision: current.revision,
    });
    return this.save({
      ...current,
      status: 'approved',
      updatedAt: approvedAt,
      approval,
      feedback: undefined,
    });
  }

  updateDraft(id: string, draft: DraftPack, updatedAt = new Date().toISOString()): ContentRun {
    const current = this.require(id);
    return this.save({
      ...current,
      status: 'draft',
      updatedAt,
      revision: current.revision + 1,
      draft,
      approval: undefined,
      publishReceipt: undefined,
    });
  }

  requestChanges(id: string, feedback: string, updatedAt = new Date().toISOString()): ContentRun {
    const current = this.require(id);
    return this.save({
      ...current,
      status: 'needs_changes',
      updatedAt,
      feedback,
      approval: undefined,
    });
  }

  updateQualifiedConversations(
    id: string,
    count: number,
    updatedAt = new Date().toISOString(),
  ): ContentRun {
    const current = this.require(id);
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Qualified conversations must be a non-negative integer.');
    }
    return this.save({
      ...current,
      updatedAt,
      qualifiedConversations: count,
    });
  }

  recordPublishReceipt(receipt: PublishReceipt): ContentRun {
    const current = this.require(receipt.runId);
    const expectedDigest = computeApprovalDigest(current.draft);
    if (!current.approval || current.approval.digest !== expectedDigest) {
      throw new Error('Run approval is missing or stale.');
    }
    return this.save({
      ...current,
      status: receipt.status === 'scheduled' ? 'scheduled' : receipt.status === 'partial' ? 'partial' : 'approved',
      updatedAt: receipt.attemptedAt,
      publishReceipt: receipt,
    });
  }

  importPriorPosts(posts: PriorPost[]): number {
    let imported = 0;
    const insert = this.database.prepare(`
      INSERT OR IGNORE INTO prior_posts (id, platform, imported_at, payload)
      VALUES (?, ?, ?, ?)
    `);
    for (const post of posts) {
      const validated = PriorPostSchema.parse(post);
      const result = insert.run(
        validated.id,
        validated.platform,
        validated.importedAt,
        JSON.stringify(validated),
      );
      imported += Number(result.changes);
    }
    return imported;
  }

  listPriorPosts(): PriorPost[] {
    const rows = this.database
      .prepare('SELECT payload FROM prior_posts ORDER BY imported_at DESC, id ASC')
      .all() as unknown as PriorPostRow[];
    return rows.map(row => PriorPostSchema.parse(JSON.parse(row.payload) as unknown));
  }

  recordBoardSync(
    id: string,
    result: { boardLink?: BoardLink; receipt: BoardSyncReceipt },
  ): ContentRun {
    const current = this.require(id);
    return this.save({
      ...current,
      updatedAt: result.receipt.attemptedAt,
      boardLink: result.boardLink ?? current.boardLink,
      boardSync: BoardSyncReceiptSchema.parse(result.receipt),
    });
  }

  recordArchive(id: string, manifest: ArchiveManifest): ContentRun {
    const current = this.require(id);
    const validated = ArchiveManifestSchema.parse(manifest);
    if (!current.approval || current.approval.digest !== validated.digest) {
      throw new Error('Archive manifest does not match the current approval.');
    }
    return this.save({
      ...current,
      status: 'archived',
      updatedAt: validated.archivedAt,
      archiveManifest: validated,
    });
  }

  private require(id: string): ContentRun {
    const run = this.get(id);
    if (!run) throw new Error(`Unknown content run "${id}".`);
    return run;
  }
}
