import { describe, expect, test } from 'vitest';

import {
  resolvePublicHost,
  validateSourceUrl,
} from '@/research/sourcePolicy';

describe('source policy', () => {
  test('allows public HTTPS pages on approved hosts', () => {
    expect(
      validateSourceUrl('https://rise.sk/portfolio/grant-ai', ['rise.sk', 'www.linkedin.com']),
    ).toEqual({ allowed: true });
  });

  test.each([
    'http://rise.sk/portfolio/grant-ai',
    'https://user:secret@rise.sk/portfolio/grant-ai',
    'https://127.0.0.1/private',
    'https://localhost:4173/private',
    'https://unapproved.example/product',
    'https://[::]/private',
    'https://[::1]/private',
    'https://[fc00::1]/private',
    'https://[fe80::1]/private',
    'https://[::ffff:127.0.0.1]/private',
  ])('rejects unsafe or unapproved source %s', url => {
    expect(validateSourceUrl(url, ['rise.sk'])).toMatchObject({ allowed: false });
  });

  test.each([
    ['127.0.0.1.sslip.io', [{ address: '127.0.0.1', family: 4 as const }]],
    ['metadata.google.internal', [{ address: '169.254.169.254', family: 4 as const }]],
    ['mixed.example', [
      { address: '93.184.216.34', family: 4 as const },
      { address: 'fc00::1', family: 6 as const },
    ]],
  ])('rejects %s when any resolved address is non-public', async (hostname, addresses) => {
    await expect(resolvePublicHost(hostname, async () => addresses)).rejects.toThrow(
      /public|private|reserved/i,
    );
  });

  test.each([
    '2002:7f00:0001::',
    '2002:a9fe:a9fe::',
    '2002:0a00:0001::',
  ])('rejects IPv6 transition address %s that can encode a blocked IPv4 target', async address => {
    await expect(
      resolvePublicHost('rise.sk', async () => [{ address, family: 6 }]),
    ).rejects.toThrow(/public|private|reserved/i);
  });

  test('returns one validated address snapshot that a transport can pin without a second DNS lookup', async () => {
    let resolutions = 0;
    const pinned = await resolvePublicHost('rise.sk', async () => {
      resolutions += 1;
      return [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
      ];
    });

    expect(resolutions).toBe(1);
    expect(pinned).toEqual({ address: '93.184.216.34', family: 4 });
  });
});
