import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type SourcePolicyResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export interface ResolvedPublicAddress {
  address: string;
  family: 4 | 6;
}

export type HostResolver = (
  hostname: string,
) => Promise<readonly ResolvedPublicAddress[]>;

function normalizedHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/gu, '').split('%')[0];
}

function ipv4Number(address: string): number | undefined {
  if (isIP(address) !== 4) return undefined;
  const octets = address.split('.').map(Number);
  return (
    ((octets[0] << 24) >>> 0) +
    (octets[1] << 16) +
    (octets[2] << 8) +
    octets[3]
  ) >>> 0;
}

function inIpv4Range(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

function isPublicIpv4(address: string): boolean {
  const value = ipv4Number(address);
  if (value === undefined) return false;
  const blocked: Array<[number, number]> = [
    [0x00000000, 8],
    [0x0a000000, 8],
    [0x64400000, 10],
    [0x7f000000, 8],
    [0xa9fe0000, 16],
    [0xac100000, 12],
    [0xc0000000, 24],
    [0xc0000200, 24],
    [0xc0586300, 24],
    [0xc0a80000, 16],
    [0xc6120000, 15],
    [0xc6336400, 24],
    [0xcb007100, 24],
    [0xe0000000, 4],
    [0xf0000000, 4],
  ];
  return !blocked.some(([base, prefix]) => inIpv4Range(value, base, prefix));
}

function ipv6Words(address: string): number[] | undefined {
  const normalized = normalizedHostname(address);
  if (isIP(normalized) !== 6) return undefined;
  const halves = normalized.split('::');
  if (halves.length > 2) return undefined;
  const parseHalf = (half: string): number[] =>
    half ? half.split(':').map(part => Number.parseInt(part, 16)) : [];
  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1] ?? '');
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return undefined;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function isPublicIpv6(address: string): boolean {
  const words = ipv6Words(address);
  if (!words) return false;
  const mapped =
    words.slice(0, 5).every(word => word === 0) &&
    words[5] === 0xffff;
  if (mapped) {
    const ipv4 = `${words[6] >>> 8}.${words[6] & 0xff}.${words[7] >>> 8}.${words[7] & 0xff}`;
    return isPublicIpv4(ipv4);
  }
  const allZero = words.every(word => word === 0);
  const loopback = words.slice(0, 7).every(word => word === 0) && words[7] === 1;
  if (allZero || loopback) return false;
  if ((words[0] & 0xfe00) === 0xfc00) return false;
  if ((words[0] & 0xffc0) === 0xfe80) return false;
  if ((words[0] & 0xff00) === 0xff00) return false;
  // Reject transition mechanisms that can carry an IPv4 destination inside
  // an otherwise globally-routed IPv6 literal.
  if (words[0] === 0x2002) return false; // 6to4
  if (words[0] === 0x2001 && words[1] === 0x0000) return false; // Teredo
  if (words[0] === 0x2001 && words[1] === 0x0db8) return false;
  // Public source fetching is deliberately conservative: only globally routed
  // unicast space is accepted.
  return (words[0] & 0xe000) === 0x2000;
}

export function isPublicAddress(address: string): boolean {
  const normalized = normalizedHostname(address);
  if (isIP(normalized) === 4) return isPublicIpv4(normalized);
  if (isIP(normalized) === 6) return isPublicIpv6(normalized);
  return false;
}

async function defaultResolver(hostname: string): Promise<ResolvedPublicAddress[]> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses
    .filter(
      (entry): entry is { address: string; family: 4 | 6 } =>
        entry.family === 4 || entry.family === 6,
    )
    .map(entry => ({ address: entry.address, family: entry.family }));
}

/**
 * Resolves exactly once and rejects the complete answer set if any address is
 * non-public. The returned address is the immutable snapshot used by the
 * HTTPS transport's custom lookup callback.
 */
export async function resolvePublicHost(
  hostname: string,
  resolver: HostResolver = defaultResolver,
): Promise<ResolvedPublicAddress> {
  const normalized = normalizedHostname(hostname);
  const literalFamily = isIP(normalized);
  const addresses =
    literalFamily === 4 || literalFamily === 6
      ? [{ address: normalized, family: literalFamily as 4 | 6 }]
      : await resolver(normalized);
  if (addresses.length === 0) {
    throw new Error(`Source hostname ${normalized} did not resolve to a public address.`);
  }
  if (addresses.some(address => !isPublicAddress(address.address))) {
    throw new Error(`Source hostname ${normalized} resolved to a private or reserved address.`);
  }
  return { ...addresses[0] };
}

function isPrivateHost(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  const family = isIP(normalized);
  return (family === 4 || family === 6) && !isPublicAddress(normalized);
}

export function validateSourceUrl(url: string, approvedHosts: readonly string[]): SourcePolicyResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'Source URL is invalid.' };
  }

  if (parsed.protocol !== 'https:') {
    return { allowed: false, reason: 'Source must use HTTPS.' };
  }
  if (parsed.username || parsed.password) {
    return { allowed: false, reason: 'Source URL must not contain credentials.' };
  }
  if (isPrivateHost(parsed.hostname)) {
    return { allowed: false, reason: 'Private and local hosts are not allowed.' };
  }
  const normalizedApprovedHosts = new Set(approvedHosts.map(host => host.toLowerCase()));
  if (!normalizedApprovedHosts.has(parsed.hostname.toLowerCase())) {
    return { allowed: false, reason: `Host ${parsed.hostname} is not approved.` };
  }
  return { allowed: true };
}
