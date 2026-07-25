import type { Metadata } from 'next';

import { PublicReviewStudio } from '@/components/PublicReviewStudio';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';
import { createDemoRun } from '@/demo/createDemoRun';
import { createPublicReviewModel } from '@/public/publicReviewModel';

const REVIEW_URL = 'https://marosko123.github.io/rise-social/review/';

export const metadata: Metadata = {
  title: 'Read-only kontrolné štúdio',
  description:
    'Bezpečná verejná ukážka platformových verzií, vizuálov, zdrojov a ľudských kontrol Rise.sk.',
  alternates: {
    canonical: REVIEW_URL,
  },
  openGraph: {
    url: REVIEW_URL,
    title: 'Read-only kontrolné štúdio | Rise Social Studio',
    description:
      'Bezpečná ukážka kontrolného workflowu. Nič sa neschvaľuje, neexportuje ani nepublikuje.',
  },
};

export default function PublicReviewPage() {
  const fixedDemoTime = new Date(
    `${RISE_CONTENT_PLAN.projectRegistryCheckedAt}T08:00:00.000Z`,
  );

  return (
    <PublicReviewStudio
      model={createPublicReviewModel(createDemoRun(fixedDemoTime))}
    />
  );
}
