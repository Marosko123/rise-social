import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NextResponse } from 'next/server';

import { computeApprovalDigest } from '@/domain/approval';
import { getRunRepository } from '@/server/repository';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = getRunRepository().get(id);
  if (!run?.approval) return NextResponse.json({ error: 'Approved run not found.' }, { status: 404 });
  const digest = computeApprovalDigest(run.draft);
  const requestedDigest = new URL(request.url).searchParams.get('digest');
  if (requestedDigest !== digest || run.approval.digest !== digest) {
    return NextResponse.json({ error: 'Export digest is stale.' }, { status: 409 });
  }
  const exportRoot =
    process.env.RISE_SOCIAL_EXPORT_ROOT ?? join(process.cwd(), 'data', 'exports');
  const zipPath = join(exportRoot, id.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), `${digest}.zip`);
  if (!existsSync(zipPath)) return NextResponse.json({ error: 'Export file not found.' }, { status: 404 });
  const bytes = await readFile(zipPath);
  return new Response(bytes, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="rise-social-${id}.zip"`,
      'cache-control': 'no-store',
    },
  });
}
