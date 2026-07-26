import { renderPublicChatGptContextMarkdown } from '@/public/visualSystem';

export function GET() {
  return new Response(renderPublicChatGptContextMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
