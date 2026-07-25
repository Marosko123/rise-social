import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');

describe('GitHub workflow supply-chain baseline', () => {
  test('pins every action and runs the complete Pages gate', () => {
    expect(workflow).toContain(
      'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    );
    expect(workflow).toContain(
      'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    );
    expect(workflow).not.toContain('actions/configure-pages@');
    expect(workflow).not.toContain('actions/upload-pages-artifact@');
    expect(workflow).not.toContain('actions/deploy-pages@');
    expect(workflow).toContain('npm run verify:pages');
    expect(workflow).toContain('npm run build:pages');
  });

  test('keeps verification read-only and grants branch write only after verification', () => {
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read/);
    expect(workflow).toMatch(
      /publish:\s*[\s\S]*?needs: verify[\s\S]*?permissions:\s*\n\s+contents: write/,
    );
    expect(workflow).toContain('persist-credentials: true');
    expect(workflow).toContain('HEAD:gh-pages');
    expect(workflow).toContain("if: github.event_name != 'pull_request'");
    expect(workflow.match(/github\.event\.repository\.visibility == 'public'/g))
      .toHaveLength(2);
  });

  test('never cancels an in-flight publish and smoke-tests the exact live revision', () => {
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('needs: publish');
    expect(workflow).toContain('https://marosko123.github.io/rise-social/');
    expect(workflow).toContain('deployment.txt');
    expect(workflow).toContain('EXPECTED_SHA: ${{ github.sha }}');
    expect(workflow).toContain('fetch "content-plan/"');
    expect(workflow).toContain('fetch "review/"');
    expect(workflow).toContain('fetch "robots.txt"');
    expect(workflow).toContain('fetch "sitemap.xml"');
    expect(workflow).toContain('fetch "llms.txt"');
  });
});
