import { PUBLIC_STARTER_PACK } from '@/public/visualSystem';

export function GET() {
  return Response.json(PUBLIC_STARTER_PACK);
}
