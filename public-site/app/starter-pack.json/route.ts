import { PUBLIC_STARTER_PACK } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(PUBLIC_STARTER_PACK, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}
