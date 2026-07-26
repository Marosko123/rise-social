import { renderPublicChatGptContextMarkdown } from '@/public/visualSystem';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderPublicChatGptContextMarkdown(), {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
