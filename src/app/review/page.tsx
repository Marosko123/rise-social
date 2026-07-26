import { ReviewStudio } from '@/components/ReviewStudio';
import {
  ensureDemoRun,
  getRunRepository,
  isPublishingConfigured,
} from '@/server/repository';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const selectedId = (await searchParams).run;
  const selected = selectedId ? getRunRepository().get(selectedId) : undefined;

  return (
    <ReviewStudio
      initialRun={selected ?? ensureDemoRun()}
      publishingReady={isPublishingConfigured()}
    />
  );
}
