import { NextResponse } from 'next/server';
import { z } from 'zod';

import { PlatformSchema } from '@/domain/schemas';
import { assertLocalMutationRequest } from '@/server/requestSecurity';
import { getRunRepository } from '@/server/repository';

const BodySchema = z.object({
  postId: z.string().min(1),
  platform: PlatformSchema,
  scheduledFor: z.iso.datetime(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertLocalMutationRequest(request, 'schedule-edit');
    const { id } = await context.params;
    const body = BodySchema.parse(await request.json());
    const repository = getRunRepository();
    const current = repository.get(id);
    if (!current) throw new Error(`Unknown content run "${id}".`);
    const draft = structuredClone(current.draft);
    const post = draft.posts.find(item => item.id === body.postId);
    if (!post) throw new Error(`Unknown post "${body.postId}".`);
    post.platforms[body.platform].scheduledFor = body.scheduledFor;
    return NextResponse.json({ run: repository.updateDraft(id, draft) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Schedule update failed.' },
      { status: 400 },
    );
  }
}
