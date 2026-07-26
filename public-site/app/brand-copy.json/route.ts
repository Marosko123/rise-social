import { PUBLIC_BRAND_COPY } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(PUBLIC_BRAND_COPY, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
