import { NextResponse } from 'next/server';
import { z } from 'zod';

import { assertLocalMutationRequest } from '@/server/requestSecurity';
import { getRunRepository } from '@/server/repository';

const BodySchema = z.object({ feedback: z.string().trim().min(3).max(4_000) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertLocalMutationRequest(request, 'changes');
    const { id } = await context.params;
    const { feedback } = BodySchema.parse(await request.json());
    return NextResponse.json({ run: getRunRepository().requestChanges(id, feedback) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Change request failed.' },
      { status: 400 },
    );
  }
}
