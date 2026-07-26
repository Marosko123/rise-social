import { PUBLIC_INSTAGRAM_CAROUSEL_PLAYBOOK } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(PUBLIC_INSTAGRAM_CAROUSEL_PLAYBOOK, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
