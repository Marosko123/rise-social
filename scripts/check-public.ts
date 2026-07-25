import { execFileSync } from 'node:child_process';
import {
  closeSync,
  lstatSync,
  openSync,
  readSync,
  readlinkSync,
  readdirSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';

import {
  findPublicSurfaceViolations,
  type PublicSurfaceViolation,
} from '../src/public/publicSurface';

const SCAN_CHUNK_BYTES = 64 * 1024;
const SCAN_OVERLAP_CHARACTERS = 1_024;

interface CliOptions {
  root: string;
  paths: string[];
}

function parseOptions(args: string[]): CliOptions {
  let root = process.cwd();
  const paths: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--root') {
      const value = args[index + 1];
      if (!value) throw new Error('--root requires a directory');
      root = resolve(value);
      index += 1;
    } else if (argument === '--path') {
      const value = args[index + 1];
      if (!value) throw new Error('--path requires a relative path');
      paths.push(value.replaceAll('\\', '/'));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { root, paths };
}

function repositoryPaths(root: string): string[] {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  );
  return output.split('\0').filter(Boolean);
}

function publicExportPaths(exportRoot: string, root: string): string[] {
  let exportRootStats;
  try {
    exportRootStats = lstatSync(exportRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  if (exportRootStats.isSymbolicLink()) {
    return [relative(root, exportRoot).replaceAll('\\', '/')];
  }
  if (!exportRootStats.isDirectory()) return [];

  const paths: string[] = [];
  const visit = (directory: string) => {
    for (const item of readdirSync(directory)) {
      const absolute = join(directory, item);
      const stats = lstatSync(absolute);
      if (stats.isSymbolicLink()) {
        paths.push(relative(root, absolute).replaceAll('\\', '/'));
      } else if (stats.isDirectory()) {
        visit(absolute);
      }
      else paths.push(relative(root, absolute).replaceAll('\\', '/'));
    }
  };
  visit(exportRoot);
  return paths;
}

function isBinary(buffer: Buffer): boolean {
  if (buffer.includes(0)) return true;
  const sampleSize = Math.min(buffer.length, 8_192);
  let suspiciousControls = 0;
  for (let index = 0; index < sampleSize; index += 1) {
    const value = buffer[index];
    const allowedControl = value === 9 || value === 10 || value === 13;
    if (value < 32 && !allowedControl) suspiciousControls += 1;
  }
  return sampleSize > 0 && suspiciousControls / sampleSize > 0.01;
}

function isConcreteDirectoryPath(root: string, target: string): boolean {
  const relativeTarget = relative(root, target);
  if (isAbsolute(relativeTarget)) return false;

  const components = relativeTarget.split(/[\\/]/).filter(Boolean);
  if (components.length === 0 || components[0] === '..') return false;

  let current = root;
  for (const component of components) {
    current = join(current, component);
    let stats;
    try {
      stats = lstatSync(current);
    } catch {
      return false;
    }
    if (stats.isSymbolicLink() || !stats.isDirectory()) return false;
  }
  return true;
}

function symlinkViolation(
  path: string,
  root: string,
  absolutePath: string,
): PublicSurfaceViolation | undefined {
  const relativePath = relative(root, absolutePath);
  const components = relativePath.split(/[\\/]/).filter(Boolean);
  let current = root;

  for (const component of components) {
    current = join(current, component);
    const stats = lstatSync(current);
    if (stats.isSymbolicLink()) {
      const relativeCurrent = relative(root, current).replaceAll('\\', '/');
      const rawTarget = readlinkSync(current);
      const isCanonicalSkillAliasPath =
        relativeCurrent === '.claude/skills' && current === absolutePath;
      if (
        isCanonicalSkillAliasPath &&
        rawTarget === '../.agents/skills'
      ) {
        const target = resolve(dirname(current), rawTarget);
        const expectedTarget = resolve(root, '.agents/skills');
        if (
          target === expectedTarget &&
          target.startsWith(`${root}/`) &&
          isConcreteDirectoryPath(root, target)
        ) {
          return undefined;
        }
        return {
          path,
          kind: 'symlink-path',
          detail:
            'canonical skill alias target must be an existing non-symlink directory',
        };
      }
      return {
        path,
        kind: 'symlink-path',
        detail: 'symbolic links are not allowed in the public surface',
      };
    }
  }
  return undefined;
}

function scanPath(path: string, root: string): PublicSurfaceViolation[] {
  const pathViolations = findPublicSurfaceViolations([{ path }]);
  const forbidden = pathViolations.some(
    violation => violation.kind === 'forbidden-path',
  );
  if (forbidden) return pathViolations;

  const absolutePath = resolve(root, path);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}/`)) {
    return findPublicSurfaceViolations([{ path: `../${path}` }]);
  }
  const linkedPath = symlinkViolation(path, root, absolutePath);
  if (linkedPath) return [...pathViolations, linkedPath];

  const stats = lstatSync(absolutePath);
  if (!stats.isFile() || stats.size === 0) {
    return pathViolations;
  }

  const descriptor = openSync(absolutePath, 'r');
  const buffer = Buffer.allocUnsafe(SCAN_CHUNK_BYTES);
  const decoder = new StringDecoder('utf8');
  const violations = new Map<string, PublicSurfaceViolation>();
  for (const violation of pathViolations) {
    violations.set(
      `${violation.path}:${violation.kind}:${violation.detail}`,
      violation,
    );
  }
  let overlap = '';
  let binary = false;

  try {
    while (true) {
      const bytesRead = readSync(
        descriptor,
        buffer,
        0,
        SCAN_CHUNK_BYTES,
        null,
      );
      if (bytesRead === 0) break;
      const chunk = buffer.subarray(0, bytesRead);
      const chunkIsBinary: boolean = binary || isBinary(chunk);
      binary = chunkIsBinary;
      const decoded = chunkIsBinary
        ? chunk.toString('latin1')
        : decoder.write(chunk);
      const content = `${overlap}${decoded}`;
      for (const violation of findPublicSurfaceViolations([{ path, content }])) {
        violations.set(
          `${violation.path}:${violation.kind}:${violation.detail}`,
          violation,
        );
      }
      overlap = content.slice(-SCAN_OVERLAP_CHARACTERS);
    }

    if (!binary) {
      const tail = decoder.end();
      if (tail) {
        const content = `${overlap}${tail}`;
        for (const violation of findPublicSurfaceViolations([
          { path, content },
        ])) {
          violations.set(
            `${violation.path}:${violation.kind}:${violation.detail}`,
            violation,
          );
        }
      }
    }
  } finally {
    closeSync(descriptor);
  }

  return [...violations.values()];
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  if (lstatSync(options.root).isSymbolicLink()) {
    console.error('Public surface check failed:');
    console.error('- .: symbolic links are not allowed as --root');
    process.exitCode = 1;
    return;
  }
  const explicitPaths = options.paths.length > 0;
  const paths = explicitPaths
    ? options.paths
    : [
        ...repositoryPaths(options.root),
        ...(() => {
          try {
            lstatSync(join(options.root, '--full-page'));
            return ['--full-page'];
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
            throw error;
          }
        })(),
        ...publicExportPaths(
          join(options.root, 'public-site', 'out'),
          options.root,
        ),
      ];
  const uniquePaths = [...new Set(paths)];
  const violations = uniquePaths.flatMap(path =>
    scanPath(path, options.root),
  );

  if (violations.length > 0) {
    console.error('Public surface check failed:');
    for (const violation of violations) {
      console.error(`- ${violation.path}: ${violation.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Public surface check passed (${uniquePaths.length} files inspected).`,
    );
  }
}

main();
