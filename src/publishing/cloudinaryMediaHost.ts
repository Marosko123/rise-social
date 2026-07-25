import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import type { HostedMedia, MediaHost } from './publishApprovedRun';

interface CloudinaryOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}

function contentType(extension: string): string {
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  return 'image/png';
}

export class CloudinaryMediaHost implements MediaHost {
  private readonly fetcher: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly options: CloudinaryOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async upload(filePath: string, publicId: string): Promise<HostedMedia> {
    const extension = extname(filePath).toLowerCase();
    const resourceType = extension === '.pdf' ? 'raw' : 'image';
    const timestamp = Math.floor(this.now().getTime() / 1_000).toString();
    const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${this.options.apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');
    const bytes = await readFile(filePath);
    const form = new FormData();
    form.set('file', new Blob([bytes], { type: contentType(extension) }), filePath.split('/').at(-1));
    form.set('public_id', publicId);
    form.set('timestamp', timestamp);
    form.set('api_key', this.options.apiKey);
    form.set('signature', signature);

    const response = await this.fetcher(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.options.cloudName)}/${resourceType}/upload`,
      {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30_000),
      },
    );
    const payload = (await response.json()) as {
      secure_url?: string;
      public_id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.secure_url || !payload.public_id) {
      throw new Error(
        `Cloudinary upload failed: ${payload.error?.message ?? `HTTP ${response.status}`}`,
      );
    }
    return { url: payload.secure_url, publicId: payload.public_id, resourceType };
  }

  async remove(publicId: string, resourceType: 'image' | 'raw'): Promise<void> {
    const timestamp = Math.floor(this.now().getTime() / 1_000).toString();
    const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${this.options.apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');
    const form = new FormData();
    form.set('public_id', publicId);
    form.set('timestamp', timestamp);
    form.set('api_key', this.options.apiKey);
    form.set('signature', signature);
    const response = await this.fetcher(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.options.cloudName)}/${resourceType}/destroy`,
      {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30_000),
      },
    );
    const payload = (await response.json()) as {
      result?: string;
      error?: { message?: string };
    };
    if (!response.ok || !['ok', 'not found'].includes(payload.result ?? '')) {
      throw new Error(
        `Cloudinary cleanup failed: ${payload.error?.message ?? `HTTP ${response.status}`}`,
      );
    }
  }
}
