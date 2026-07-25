import { PUBLIC_VISUAL_PLAYBOOK } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(PUBLIC_VISUAL_PLAYBOOK, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
