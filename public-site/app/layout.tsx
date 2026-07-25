import type { Metadata } from 'next';

import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/playfair-display/latin-500.css';
import '../../src/app/globals.css';

const PUBLIC_ORIGIN = 'https://marosko123.github.io';
const PUBLIC_PATH = '/rise-social';
const PUBLIC_URL = `${PUBLIC_ORIGIN}${PUBLIC_PATH}/`;

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_ORIGIN),
  title: {
    default: 'Rise Social Studio — 90-dňový content plán',
    template: '%s | Rise Social Studio',
  },
  description:
    'Verejná read-only prezentácia 90-dňového content plánu a kontrolného workflowu Rise.sk.',
  alternates: {
    canonical: PUBLIC_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'sk_SK',
    siteName: 'Rise Social Studio',
    title: 'Rise Social Studio — 90-dňový content plán',
    description:
      'Profesionálny plán značky, projektových dôkazov, vzdelávania a human-gated AI workflowu Rise.sk.',
    url: PUBLIC_URL,
    images: [
      {
        url: `${PUBLIC_ORIGIN}${PUBLIC_PATH}/rise-social-og.svg`,
        width: 1200,
        height: 630,
        alt: 'Rise Social Studio — softvér, dáta a AI',
      },
    ],
  },
};

export default function PublicRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
