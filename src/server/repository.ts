import { join } from 'node:path';

import { createDemoRun } from '@/demo/createDemoRun';
import type { ContentRun } from '@/domain/schemas';
import { RunRepository } from '@/storage/runRepository';

const globalRepository = globalThis as typeof globalThis & {
  riseSocialRepository?: RunRepository;
};

export function getRunRepository(): RunRepository {
  if (!globalRepository.riseSocialRepository) {
    const databasePath =
      process.env.RISE_SOCIAL_DB_PATH ?? join(process.cwd(), 'data', 'studio.sqlite');
    globalRepository.riseSocialRepository = new RunRepository(databasePath);
  }
  return globalRepository.riseSocialRepository;
}

export function ensureDemoRun(): ContentRun {
  const repository = getRunRepository();
  const now = new Date();
  const demoRun = createDemoRun(now);
  const currentDemo = repository.get(demoRun.id);
  if (currentDemo?.draft.workflowContext) return currentDemo;

  return repository.save(demoRun);
}

export function isPublishingConfigured(): boolean {
  return [
    'BUFFER_API_KEY',
    'BUFFER_INSTAGRAM_CHANNEL_ID',
    'BUFFER_LINKEDIN_CHANNEL_ID',
    'BUFFER_FACEBOOK_CHANNEL_ID',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ].every(key => Boolean(process.env[key]?.trim()));
}
