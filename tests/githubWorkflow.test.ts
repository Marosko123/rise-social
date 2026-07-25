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
    expect(workflow).toContain(
      'actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b',
    );
    expect(workflow).toContain(
      'actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b',
    );
    expect(workflow).toContain(
      'actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e',
    );
    expect(workflow).toContain('npm run verify:pages');
  });

  test('keeps verification read-only and grants deploy permissions only to Pages', () => {
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read/);
    expect(workflow).toMatch(
      /deploy:\s*[\s\S]*?permissions:\s*\n\s+contents: read\s*\n\s+pages: write\s*\n\s+id-token: write/,
    );
    expect(workflow).toContain("if: github.event_name != 'pull_request'");
    expect(workflow).toContain('environment:');
    expect(workflow).toContain('name: github-pages');
    expect(workflow.match(/github\.event\.repository\.visibility == 'public'/g))
      .toHaveLength(4);
  });

  test('never cancels an in-flight deploy and smoke-tests the live site', () => {
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('needs: deploy');
    expect(workflow).toContain('https://marosko123.github.io/rise-social/');
    expect(workflow).toContain('fetch "content-plan/"');
    expect(workflow).toContain('fetch "review/"');
    expect(workflow).toContain('fetch "robots.txt"');
    expect(workflow).toContain('fetch "sitemap.xml"');
    expect(workflow).toContain('fetch "llms.txt"');
  });
});
