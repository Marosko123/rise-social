import { renderPublicInstagramCarouselPlaybookMarkdown } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderPublicInstagramCarouselPlaybookMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
