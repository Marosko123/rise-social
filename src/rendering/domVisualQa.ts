import type { Page } from 'playwright-core';

export type DomSlideMetric = {
  slide: number;
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  headlineLineCount: number;
  elements: Array<{
    selector: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
    scrollWidth: number;
    clientWidth: number;
    scrollHeight: number;
    clientHeight: number;
  }>;
};

/** Deterministic geometry checks; human review still judges semantic visual quality. */
export function findDomVisualQaFindings(metrics: readonly DomSlideMetric[]): string[] {
  const findings = new Set<string>();
  for (const slide of metrics) {
    // Decorative ambient shapes intentionally extend outside the clipped slide
    // horizontally. Vertical expansion still indicates content escape.
    if (slide.scrollHeight > slide.clientHeight) {
      findings.add('slide-overflow');
    }
    if (slide.slide === 1 && slide.headlineLineCount > 2) {
      findings.add('cover-line-count');
    }
    for (const element of slide.elements) {
      if (
        element.clientWidth > 0 &&
        element.clientHeight > 0 &&
        (element.scrollWidth > element.clientWidth + 8 || element.scrollHeight > element.clientHeight + 8)
      ) {
        findings.add('element-overflow');
      }
      if (
        element.clientWidth > 0 &&
        element.clientHeight > 0 &&
        (element.left < 84 || element.right > 996 || element.top < 84 || element.bottom > 1266)
      ) {
        findings.add('safe-zone-overflow');
      }
    }
  }
  return [...findings];
}

export async function evaluateDomVisualQa(page: Page): Promise<string[]> {
  const metrics = await page.locator('[data-slide]').evaluateAll(slides =>
    slides.map((slide, index) => {
      const inspect = Array.from(slide.querySelectorAll<HTMLElement>('h1, p, .copy, .visual'));
      const headline = slide.querySelector('h1');
      const range = document.createRange();
      if (headline) range.selectNodeContents(headline);
      return {
        slide: index + 1,
        clientWidth: slide.clientWidth,
        clientHeight: slide.clientHeight,
        scrollWidth: slide.scrollWidth,
        scrollHeight: slide.scrollHeight,
        headlineLineCount: headline ? range.getClientRects().length : 0,
        elements: inspect.map(element => {
          const box = element.getBoundingClientRect();
          const slideBox = slide.getBoundingClientRect();
          return {
            selector: element.tagName.toLowerCase(),
            left: box.left - slideBox.left,
            right: box.right - slideBox.left,
            top: box.top - slideBox.top,
            bottom: box.bottom - slideBox.top,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
          };
        }),
      };
    }),
  );
  return findDomVisualQaFindings(metrics);
}
