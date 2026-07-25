import type { Platform } from './schemas';

function campaignMonth(now: Date): string {
  return now.toISOString().slice(0, 7).replace('-', '_');
}

export function trackedPlatformLink(
  link: string,
  platform: Platform,
  runId: string,
  postId: string,
  now = new Date(),
): string {
  const tracked = new URL(link);
  tracked.searchParams.set('utm_source', platform);
  tracked.searchParams.set('utm_medium', 'organic_social');
  tracked.searchParams.set('utm_campaign', `rise_social_${campaignMonth(now)}`);
  tracked.searchParams.set('utm_content', `${runId}_${postId}`);
  return tracked.toString();
}

export function publishingText(
  caption: string,
  link: string | undefined,
  platform: Platform,
  runId: string,
  postId: string,
  now = new Date(),
): string {
  if (!link || platform === 'instagram') return caption;
  return `${caption}\n\n${trackedPlatformLink(link, platform, runId, postId, now)}`;
}
