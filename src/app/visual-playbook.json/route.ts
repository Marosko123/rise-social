import { PUBLIC_VISUAL_PLAYBOOK } from '@/public/visualSystem';

export function GET() {
  return Response.json(PUBLIC_VISUAL_PLAYBOOK);
}
