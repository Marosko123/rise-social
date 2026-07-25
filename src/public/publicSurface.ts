export interface PublicSurfaceEntry {
  path: string;
  content?: string;
}

export interface PublicSurfaceViolation {
  path: string;
  kind:
    | 'forbidden-path'
    | 'secret-pattern'
    | 'public-api-route'
    | 'public-mutation-control'
    | 'symlink-path';
  detail: string;
}

const FORBIDDEN_PATHS: ReadonlyArray<RegExp> = [
  /(^|\/)\.\.(?:\/|$)/,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)data\/(?:.*\.(?:sqlite|sqlite3|db)(?:-|$)?|runs\/|exports\/|media\/|profile-pack\/)/,
  /(^|\/)(?:browser-state|playwright\/\.cache|\.auth)(?:\/|$)/,
  /^exports?(?:\/|$)/,
  /(^|\/)--full-page$/,
  /(?:^|\/)(?:id_rsa|id_ed25519|private[-_.]?key)(?:\.[^/]*)?$/i,
  /\.(?:pem|p12|pfx|key)$/i,
];

const SECRET_PATTERNS: ReadonlyArray<{ pattern: RegExp; detail: string }> = [
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, detail: 'GitHub token pattern' },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/, detail: 'GitHub token pattern' },
  { pattern: /\bsk-[A-Za-z0-9_-]{32,}\b/, detail: 'API token pattern' },
  {
    pattern: /\bperm:[A-Za-z0-9+/=_-]{4,}\.[A-Za-z0-9+/=_-]{4,}\.[A-Za-z0-9+/=_-]{16,}\b/,
    detail: 'YouTrack permanent token pattern',
  },
  {
    pattern: /(?:\/Users\/[^/\s"'<>]+\/|\/home\/[^/\s"'<>]+\/|[A-Za-z]:\\Users\\[^\\\s"'<>]+\\)/,
    detail: 'absolute local home path',
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    detail: 'private key material',
  },
];

const PUBLIC_MUTATION_MARKERS = [
  '/api/runs/',
  'Schváliť a exportovať',
  'Schváliť Buffer koncepty',
  'Schváliť a naplánovať',
  'Uložiť výsledok',
  'Uložiť čas',
  'Požiadať o úpravy',
];

function isAllowedEnvironmentExample(path: string): boolean {
  return /(^|\/)\.env\.example$/.test(path);
}

export function findPublicSurfaceViolations(
  entries: ReadonlyArray<PublicSurfaceEntry>,
): PublicSurfaceViolation[] {
  const violations: PublicSurfaceViolation[] = [];

  for (const entry of entries) {
    const normalizedPath = entry.path.replaceAll('\\', '/');

    if (
      !isAllowedEnvironmentExample(normalizedPath) &&
      FORBIDDEN_PATHS.some(pattern => pattern.test(normalizedPath))
    ) {
      violations.push({
        path: normalizedPath,
        kind: 'forbidden-path',
        detail: 'path is not allowed in the public repository surface',
      });
      continue;
    }

    if (
      normalizedPath.startsWith('public-site/out/api/') ||
      normalizedPath.includes('/public-site/out/api/')
    ) {
      violations.push({
        path: normalizedPath,
        kind: 'public-api-route',
        detail: 'the static Pages export must not expose API routes',
      });
    }

    if (entry.content) {
      for (const secretPattern of SECRET_PATTERNS) {
        if (secretPattern.pattern.test(entry.content)) {
          violations.push({
            path: normalizedPath,
            kind: 'secret-pattern',
            detail: secretPattern.detail,
          });
        }
      }
    }

    if (
      entry.content &&
      normalizedPath.startsWith('public-site/out/') &&
      PUBLIC_MUTATION_MARKERS.some(marker => entry.content?.includes(marker))
    ) {
      const containsApiMarker = entry.content.includes('/api/runs/');
      violations.push({
        path: normalizedPath,
        kind: containsApiMarker ? 'public-api-route' : 'public-mutation-control',
        detail: containsApiMarker
          ? 'the static Pages export must not include local API implementation'
          : 'the static Pages export must not include mutation controls',
      });
    }
  }

  return violations;
}
