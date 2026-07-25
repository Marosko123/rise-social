import type { Metadata } from 'next';

import { ContentPlanStudio } from '@/components/ContentPlanStudio';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';

const CONTENT_PLAN_URL =
  'https://marosko123.github.io/rise-social/content-plan/';

export const metadata: Metadata = {
  title: '90-dňový content plán',
  description:
    'Zdrojovaný plán tém, projektov, vizuálov a platformových spracovaní pre Rise.sk.',
  alternates: {
    canonical: CONTENT_PLAN_URL,
  },
  openGraph: {
    url: CONTENT_PLAN_URL,
    title: '90-dňový content plán | Rise Social Studio',
    description:
      'Zdrojovaný plán tém, projektov, vizuálov a platformových spracovaní pre Rise.sk.',
  },
};

export default function PublicContentPlanPage() {
  return <ContentPlanStudio plan={RISE_CONTENT_PLAN} />;
}
