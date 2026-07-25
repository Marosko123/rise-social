import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.RISE_SOCIAL_PAGES_PORT ?? '4183');
const root = resolve(process.cwd(), 'public-site', 'out');
const prefix = '/rise-social';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://127.0.0.1:${port}`);
  if (url.pathname === prefix) return join(root, 'index.html');
  if (!url.pathname.startsWith(`${prefix}/`)) return undefined;

  const relative = normalize(decodeURIComponent(url.pathname.slice(prefix.length)))
    .replace(/^[/\\]+/, '');
  const candidate = resolve(root, relative);
  if (!candidate.startsWith(`${root}/`) && candidate !== root) return undefined;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = join(candidate, 'index.html');
  if (existsSync(index) && statSync(index).isFile()) return index;
  return undefined;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? '/');
  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1');
