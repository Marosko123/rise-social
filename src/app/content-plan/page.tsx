import type { Metadata } from 'next';

import { ContentPlanStudio } from '@/components/ContentPlanStudio';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';

export const metadata: Metadata = {
  title: '90-dňový content plán | Rise Social Studio',
  description:
    'Zdrojovaný plán tém, projektov, vizuálov a platformových spracovaní pre Rise.sk.',
};

export default function ContentPlanPage() {
  return <ContentPlanStudio plan={RISE_CONTENT_PLAN} />;
}
