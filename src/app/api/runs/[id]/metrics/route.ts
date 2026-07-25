import { NextResponse } from 'next/server';
import { z } from 'zod';

import { assertLocalMutationRequest } from '@/server/requestSecurity';
import { getRunRepository } from '@/server/repository';

const BodySchema = z.object({ qualifiedConversations: z.number().int().nonnegative() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertLocalMutationRequest(request, 'metrics');
    const { id } = await context.params;
    const { qualifiedConversations } = BodySchema.parse(await request.json());
    return NextResponse.json({
      run: getRunRepository().updateQualifiedConversations(id, qualifiedConversations),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Metric update failed.' },
      { status: 400 },
    );
  }
}
