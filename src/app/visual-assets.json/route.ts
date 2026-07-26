import { PUBLIC_VISUAL_ASSET_MANIFEST } from '@/public/visualSystem';

export function GET() {
  return Response.json(PUBLIC_VISUAL_ASSET_MANIFEST);
}
