import { PUBLIC_CHATGPT_CONTEXT } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(PUBLIC_CHATGPT_CONTEXT, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
