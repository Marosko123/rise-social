// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { ContentPlanStudio } from '@/components/ContentPlanStudio';
import { VisualPlaybook } from '@/components/VisualPlaybook';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';

afterEach(cleanup);

describe('ContentPlanStudio', () => {
  test('presents the full 30/60-day operating system and computed disclosure count', () => {
    render(<ContentPlanStudio plan={RISE_CONTENT_PLAN} />);

    expect(
      screen.getByRole('heading', { name: '90-dňový content plán' }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('content-plan-entry')).toHaveLength(24);
    expect(screen.getAllByTestId('project-disclosure')).toHaveLength(11);
    expect(screen.getByText(/11 verejných projektov/)).toBeInTheDocument();
    expect(screen.getByText(/overené 24. júla 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '30-dňový pilot' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ďalších 60 dní' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Úlohy kanálov' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ako má ChatGPT tvoriť Rise vizuály' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /OpenAI prompting guide/i }),
    ).toHaveAttribute(
      'href',
      'https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide',
    );
    expect(screen.getAllByText(/#080807/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nie cyberpunk. Nie AI klišé./i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profilový základ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'KPI a rozhodnutie po 90 dňoch' })).toBeInTheDocument();
    expect(screen.getByText('Aktuálny zdrojový radar')).toBeInTheDocument();
    expect(screen.getByText('Len verejné a schválené podklady')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /European Commission/i })[0],
    ).toHaveAttribute('href', expect.stringMatching(/^https:/));
  });

  test('offers all five pillar filters without hiding the strategic overview', () => {
    render(<ContentPlanStudio plan={RISE_CONTENT_PLAN} />);

    const filterNames = [
      'Dôkazy',
      'Rozhodnutia',
      'Growth System',
      'Ľudia a proces',
      'Signal vs. Noise',
    ];
    for (const name of filterNames) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: 'Dôkazy' }));

    expect(screen.getAllByTestId('content-plan-entry')).toHaveLength(8);
    expect(screen.getByLabelText('Súhrn plánu')).toHaveTextContent(
      /11\s*verejných projektov/,
    );
    expect(screen.getByRole('button', { name: 'Dôkazy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('reveals exact visual direction and platform adaptations progressively', () => {
    render(<ContentPlanStudio plan={RISE_CONTENT_PLAN} />);

    const firstEntry = screen.getAllByTestId('content-plan-entry')[0];
    fireEvent.click(
      firstEntry.querySelector('summary') as HTMLElement,
    );
    expect(firstEntry).toHaveTextContent('Instagram');
    expect(firstEntry).toHaveTextContent('LinkedIn');
    expect(firstEntry).toHaveTextContent('Facebook');
    expect(firstEntry).toHaveTextContent(
      'Štyri verejné katalógové UI kandidáty',
    );
    expect(firstEntry).toHaveTextContent(/katalógové assety/i);
    expect(firstEntry).toHaveTextContent(/ľudskému schváleniu/i);
    expect(
      screen.getByText(/Plán nie je publikačné schválenie/i),
    ).toBeInTheDocument();
  });

  test('shows an honest capture gate instead of a synthetic person or fake UI', () => {
    render(<ContentPlanStudio plan={RISE_CONTENT_PLAN} />);

    const humanEntry = screen
      .getAllByTestId('content-plan-entry')
      .find(entry => entry.textContent?.includes('Čo pre nás znamená zodpovednosť'));
    expect(humanEntry).toHaveTextContent('Fotenie alebo nahrávanie je povinné');
    expect(humanEntry).toHaveTextContent('capture required');
    expect(screen.getAllByText(/asset ID: rise-home/i).length).toBeGreaterThan(0);
    expect(document.querySelector('.synthetic-person')).not.toBeInTheDocument();
    expect(document.querySelector('.fake-ui')).not.toBeInTheDocument();
  });
});

describe('VisualPlaybook', () => {
  test('explains platform formats, series recipes and generation approval semantics', () => {
    render(<VisualPlaybook headingLevel="h1" />);

    expect(
      screen.getByRole('heading', {
        name: 'Ako má ChatGPT tvoriť Rise vizuály',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('1080 × 1350 px').length).toBeGreaterThan(0);
    expect(screen.getByText('Inside the Build')).toBeInTheDocument();
    expect(screen.getByText('People Behind the Product')).toBeInTheDocument();
    expect(
      screen.getByText(/téma bez priameho pokynu.*art directions/i),
    ).toBeInTheDocument();
  });
});
