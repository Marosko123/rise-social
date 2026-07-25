import { ContentPlanStudio } from '@/components/ContentPlanStudio';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';

export default function PublicContentPlanHomePage() {
  return <ContentPlanStudio plan={RISE_CONTENT_PLAN} />;
}
