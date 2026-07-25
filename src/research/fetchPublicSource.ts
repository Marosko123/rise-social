import { request } from 'node:https';

import * as cheerio from 'cheerio';

import {
  resolvePublicHost,
  validateSourceUrl,
  type HostResolver,
  type ResolvedPublicAddress,
} from './sourcePolicy';

export interface SourceDocument {
  url: string;
  title: string;
  publisher: string;
  checkedAt: string;
  text: string;
}

const MAX_SOURCE_CHARACTERS = 500_000;
const MAX_AGENT_TEXT_CHARACTERS = 24_000;

export interface PublicSourceNetwork {
  resolver?: HostResolver;
  transport?: (
    url: string,
    init: RequestInit,
    pinned: ResolvedPublicAddress,
  ) => Promise<Response>;
}

function responseHeaders(headers: Record<string, string | string[] | undefined>): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach(item => result.append(name, item));
    else if (value !== undefined) result.set(name, value);
  }
  return result;
}

/**
 * HTTPS transport pinned to the already validated DNS snapshot. TLS still
 * validates the original hostname through SNI; the custom lookup cannot
 * perform another DNS query and redirects are never followed.
 */
async function pinnedHttpsTransport(
  url: string,
  init: RequestInit,
  pinned: ResolvedPublicAddress,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const req = request(
      parsed,
      {
        method: init.method ?? 'GET',
        headers,
        family: pinned.family,
        lookup: (_hostname, _options, callback) => {
          callback(null, pinned.address, pinned.family);
        },
        signal: init.signal ?? undefined,
      },
      response => {
        const chunks: Buffer[] = [];
        let byteLength = 0;
        response.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          byteLength += buffer.length;
          if (byteLength > MAX_SOURCE_CHARACTERS) {
            req.destroy(
              new Error(`Source exceeds ${MAX_SOURCE_CHARACTERS} characters: ${url}`),
            );
            return;
          }
          chunks.push(buffer);
        });
        response.on('end', () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode ?? 500,
              statusText: response.statusMessage,
              headers: responseHeaders(response.headers),
            }),
          );
        });
        response.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

export async function fetchPublicSource(
  url: string,
  approvedHosts: readonly string[],
  fetcher?: typeof fetch,
  checkedAt = new Date(),
  network: PublicSourceNetwork = {},
): Promise<SourceDocument> {
  const policy = validateSourceUrl(url, approvedHosts);
  if (!policy.allowed) throw new Error(policy.reason);

  const init: RequestInit = {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'RiseSocialStudio/1.0 (+https://rise.sk)',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  };
  const response = fetcher
    ? await fetcher(url, init)
    : await (async () => {
        const pinned = await resolvePublicHost(
          new URL(url).hostname,
          network.resolver,
        );
        return (network.transport ?? pinnedHttpsTransport)(url, init, pinned);
      })();
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error(`Source is not an HTML page: ${url}`);
  }

  const html = await response.text();
  if (html.length > MAX_SOURCE_CHARACTERS) {
    throw new Error(`Source exceeds ${MAX_SOURCE_CHARACTERS} characters: ${url}`);
  }
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, form, noscript, svg').remove();
  const title = $('title').first().text().replace(/\s+/g, ' ').trim() || new URL(url).hostname;
  const contentRoot = $('main').first().length
    ? $('main').first()
    : $('article').first().length
      ? $('article').first()
      : $('body');
  const semanticBlocks = contentRoot
    .find('h1, h2, h3, h4, p, li, blockquote, figcaption')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);
  const text = (semanticBlocks.length > 0 ? semanticBlocks.join(' ') : contentRoot.text())
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_AGENT_TEXT_CHARACTERS);
  if (!text) throw new Error(`Source has no readable content: ${url}`);

  return {
    url,
    title,
    publisher: new URL(url).hostname,
    checkedAt: checkedAt.toISOString(),
    text,
  };
}
