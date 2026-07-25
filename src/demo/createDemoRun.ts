import { ContentRunSchema, type ContentRun } from '@/domain/schemas';

import { createDemoDraft } from './createDemoDraft';

export function createDemoRun(now: Date): ContentRun {
  const timestamp = now.toISOString();
  const demoId = `rise-demo-v2-${timestamp.slice(0, 10).replaceAll('-', '')}`;

  return ContentRunSchema.parse({
    id: demoId,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
    qualifiedConversations: 0,
    draft: createDemoDraft(now),
  });
}
