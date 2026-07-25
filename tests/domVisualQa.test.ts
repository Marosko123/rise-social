import { describe, expect, test } from 'vitest';

import { findDomVisualQaFindings } from '@/rendering/domVisualQa';

describe('DOM visual QA', () => {
  test('fails overflow and safe-zone violations before screenshot', () => {
    const findings = findDomVisualQaFindings([
      {
        slide: 1,
        clientWidth: 1080,
        clientHeight: 1350,
        scrollWidth: 1080,
        scrollHeight: 1400,
        headlineLineCount: 3,
        elements: [
          {
            selector: 'h1',
            left: 84,
            right: 1040,
            top: 120,
            bottom: 300,
            scrollWidth: 900,
            clientWidth: 800,
            scrollHeight: 180,
            clientHeight: 180,
          },
        ],
      },
    ]);

    expect(findings).toEqual(expect.arrayContaining(['slide-overflow', 'element-overflow', 'safe-zone-overflow', 'cover-line-count']));
  });

  test('applies the two-line headline rule only to the cover slide', () => {
    const findings = findDomVisualQaFindings([
      {
        slide: 1,
        clientWidth: 1080,
        clientHeight: 1350,
        scrollWidth: 1080,
        scrollHeight: 1350,
        headlineLineCount: 2,
        elements: [],
      },
      {
        slide: 2,
        clientWidth: 1080,
        clientHeight: 1350,
        scrollWidth: 1080,
        scrollHeight: 1350,
        headlineLineCount: 3,
        elements: [],
      },
    ]);

    expect(findings).not.toContain('cover-line-count');
  });
});
