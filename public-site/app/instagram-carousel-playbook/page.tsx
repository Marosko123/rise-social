import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { InstagramCarouselPlaybook } from '@/components/InstagramCarouselPlaybook';

const CANONICAL_URL =
  'https://marosko123.github.io/rise-social/instagram-carousel-playbook/';

export const metadata: Metadata = {
  title: 'Rise Instagram Carousel Playbook',
  description:
    'Kanonický read-only systém pre profesionálne Instagram carousely o aplikáciách Rise.sk.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    url: CANONICAL_URL,
    title: 'Rise Instagram Carousel Playbook',
    description:
      'App Case Study naratív, textové limity, originálne aktíva, produktové dôkazy a QA.',
  },
};

export default function PublicInstagramCarouselPlaybookPage() {
  return (
    <main className="content-plan-shell instagram-carousel-playbook-page">
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
            <strong>Rise Carousel System</strong>
            <small>ChatGPT-ready</small>
          </span>
        </Link>
        <div className="plan-topbar-meta">
          <span className="status-dot" aria-hidden="true" />
          <span>Verejné · read-only · zdrojované</span>
        </div>
      </header>

      <InstagramCarouselPlaybook />

      <footer className="plan-footer carousel-playbook-footer">
        <p>
          <strong>Playbook nie je publikačné schválenie.</strong> Práva,
          vizuálna QA a ľudská kontrola zostávajú povinné.
        </p>
        <div className="visual-data-links">
          <a href="../instagram-carousel-playbook.json">JSON kontrakt</a>
          <a href="../instagram-carousel-playbook.md">LLM dokument</a>
          <a href="../brand-assets.json">Originálne aktíva</a>
          <a href="../brand-copy.json">Kanonické texty</a>
        </div>
      </footer>
    </main>
  );
}
