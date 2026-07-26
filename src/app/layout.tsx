import type { Metadata } from 'next';

import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/playfair-display/latin-500.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rise.sk — ChatGPT brand context',
  description:
    'Kanonický kontext pre softvérovú identitu, produktové dôkazy, Rise branding a human-gated sociálne výstupy.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
