import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { VisualPlaybook } from '@/components/VisualPlaybook';

const VISUAL_PLAYBOOK_URL =
  'https://marosko123.github.io/rise-social/visual-playbook/';

export const metadata: Metadata = {
  title: 'Rise Visual System pre ChatGPT',
  description:
    'Verejný brand-lock, obrazové recepty, platformové formáty a bezpečný AI workflow pre sociálne vizuály Rise.sk.',
  alternates: {
    canonical: VISUAL_PLAYBOOK_URL,
  },
  openGraph: {
    url: VISUAL_PLAYBOOK_URL,
    title: 'Rise Visual System pre ChatGPT',
    description:
      'Kanonický read-only playbook pre profesionálne a zdrojované sociálne vizuály Rise.sk.',
  },
};

export default function PublicVisualPlaybookPage() {
  return (
    <main className="content-plan-shell visual-playbook-page">
      <header className="plan-topbar">
        <Link className="brand" href="/" aria-label="Rise Social Studio">
          <Image
            className="official-brand-mark"
            src="/rise-social/brand/Rise_logo.svg"
            alt=""
            width={42}
            height={42}
            unoptimized
          />
          <span>
            <strong>Rise Visual System</strong>
            <small>ChatGPT-ready</small>
          </span>
        </Link>
        <div className="plan-topbar-meta">
          <span className="status-dot" aria-hidden="true" />
          <span>Verejné · read-only · zdrojované</span>
        </div>
      </header>

      <VisualPlaybook headingLevel="h1" />

      <footer className="plan-footer">
        <div>
          <Image
            className="official-brand-mark"
            src="/rise-social/brand/Rise_logo.svg"
            alt=""
            width={42}
            height={42}
            unoptimized
          />
          <p>
            <strong>Vizuálny playbook nie je publikačné schválenie.</strong>
            Reálny výstup stále prechádza právami, vizuálnou QA a ľudskou
            kontrolou.
          </p>
        </div>
        <div className="visual-data-links">
          <a href="../visual-playbook.json">JSON kontrakt</a>
          <a href="../visual-playbook.md">LLM dokument</a>
          <a href="../visual-assets.json">Asset manifest</a>
          <a href="../instagram-carousel-playbook/">Carousel playbook</a>
        </div>
      </footer>
    </main>
  );
}
