import { PUBLIC_CHATGPT_CONTEXT } from '@/public/visualSystem';

export function GET() {
  return Response.json(PUBLIC_CHATGPT_CONTEXT);
}
