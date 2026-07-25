import { PUBLIC_VISUAL_ASSET_MANIFEST } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(PUBLIC_VISUAL_ASSET_MANIFEST, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
