import { join } from 'node:path';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createExportBundle } from '@/export/createExportBundle';
import { BufferGraphqlClient } from '@/publishing/bufferGraphqlClient';
import { CloudinaryMediaHost } from '@/publishing/cloudinaryMediaHost';
import { publishApprovedRun } from '@/publishing/publishApprovedRun';
import { PlaywrightAssetRenderer } from '@/rendering/playwrightAssetRenderer';
import { assertLocalMutationRequest } from '@/server/requestSecurity';
import { getRunRepository, isPublishingConfigured } from '@/server/repository';

export const runtime = 'nodejs';

const BodySchema = z.object({ action: z.enum(['export', 'stage', 'schedule']) });

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing publishing configuration: ${name}.`);
  return value;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertLocalMutationRequest(request, 'approve');
    const { id } = await context.params;
    const { action } = BodySchema.parse(await request.json());
    const repository = getRunRepository();
    const current = repository.get(id);
    if (
      action === 'schedule' &&
      !(
        current?.publishReceipt?.status === 'drafted' &&
        current.publishReceipt.digest === current.approval?.digest
      )
    ) {
      throw new Error(
        'Stage and review Buffer drafts before approving their schedule.',
      );
    }
    const run = repository.approve(id, action === 'export' ? 'export' : 'schedule');
    const result = await createExportBundle(
      run,
      process.env.RISE_SOCIAL_EXPORT_ROOT ?? join(process.cwd(), 'data', 'exports'),
      new PlaywrightAssetRenderer(),
    );
    if (action === 'stage' || action === 'schedule') {
      if (!isPublishingConfigured()) {
        throw new Error('Buffer and Cloudinary publishing is not fully configured.');
      }
      const receipt = await publishApprovedRun(
        run,
        result,
        {
          instagram: requiredEnvironment('BUFFER_INSTAGRAM_CHANNEL_ID'),
          linkedin: requiredEnvironment('BUFFER_LINKEDIN_CHANNEL_ID'),
          facebook: requiredEnvironment('BUFFER_FACEBOOK_CHANNEL_ID'),
        },
        new CloudinaryMediaHost({
          cloudName: requiredEnvironment('CLOUDINARY_CLOUD_NAME'),
          apiKey: requiredEnvironment('CLOUDINARY_API_KEY'),
          apiSecret: requiredEnvironment('CLOUDINARY_API_SECRET'),
        }),
        new BufferGraphqlClient({
          apiKey: requiredEnvironment('BUFFER_API_KEY'),
          apiUrl: process.env.BUFFER_API_URL,
        }),
        new Date(),
        {
          draftOnly: action === 'stage',
          assertCurrentApproval: () => {
            const latest = repository.get(id);
            if (
              !latest?.approval ||
              latest.approval.digest !== run.approval?.digest ||
              latest.approval.revision !== run.revision
            ) {
              throw new Error(
                'Current approval was invalidated before the provider action.',
              );
            }
          },
        },
      );
      return NextResponse.json({ run: repository.recordPublishReceipt(receipt) });
    }

    return NextResponse.json({
      run,
      downloadUrl: `/api/runs/${encodeURIComponent(id)}/export?digest=${result.digest}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Approval failed.' },
      { status: 400 },
    );
  }
}
