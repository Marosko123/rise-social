import type { ContentRun } from '@/domain/schemas';

export interface PublicReviewModel {
  posts: ContentRun['draft']['posts'];
  sources: ContentRun['draft']['sources'];
  claims: ContentRun['draft']['claims'];
}

export function createPublicReviewModel(run: ContentRun): PublicReviewModel {
  return structuredClone({
    posts: run.draft.posts,
    sources: run.draft.sources,
    claims: run.draft.claims,
  });
}
