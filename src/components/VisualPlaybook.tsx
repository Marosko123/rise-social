import { RISE_VISUAL_GENERATION_PLAYBOOK_V1 } from '../../brand/visual-generation-playbook.v1';

type VisualPlaybookProps = {
  headingLevel?: 'h1' | 'h2';
};

export function VisualPlaybook({
  headingLevel = 'h2',
}: VisualPlaybookProps) {
  const Heading = headingLevel;
  const playbook = RISE_VISUAL_GENERATION_PLAYBOOK_V1;

  return (
    <section
      className="visual-generation-section"
      aria-labelledby="visual-generation-title"
    >
      <div className="plan-section-head">
        <div>
          <p className="kicker">RISE VISUAL GENERATION PLAYBOOK V1</p>
          <Heading id="visual-generation-title">
            Ako má ChatGPT tvoriť Rise vizuály
          </Heading>
        </div>
        <p>
          Najprv verejný dôkaz a presná case study. Generovanie prichádza až
          potom — iba ako abstraktná editoriálna vrstva, s brand-lockom,
          provenance a ľudskou kontrolou.
        </p>
      </div>

      <div className="visual-workflow-rule">
        <strong>{playbook.chatGptWorkflow.topicOnly}</strong>
        <p>{playbook.chatGptWorkflow.directGeneration}</p>
        <small>{playbook.chatGptWorkflow.missingAsset}</small>
      </div>

      <div className="visual-reference-flow" aria-label="Poradie referencií">
        {playbook.referenceOrder.map((reference, index) => (
          <div key={reference}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{reference.replaceAll('-', ' ')}</strong>
          </div>
        ))}
      </div>

      <div className="visual-brand-grid">
        <article className="visual-brand-card visual-brand-palette">
          <span>01 — BRAND LOCK</span>
          <h3>Pokojný produktový priestor</h3>
          <div className="rise-swatches" aria-label="Rise farebná paleta">
            {Object.entries(playbook.brandLock.palette).map(([name, value]) => (
              <div key={name}>
                <i style={{ backgroundColor: value }} aria-hidden="true" />
                <strong>{name}</strong>
                <code>{value}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="visual-brand-card">
          <span>02 — VÝRAZ ZNAČKY</span>
          <h3>Jednoduché. Materiálové. Dôveryhodné.</h3>
          <p>{playbook.brandLock.statement}</p>
          <ul>
            {playbook.brandLock.mood.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="visual-brand-card">
          <span>03 — KOMPOZÍCIA A SVETLO</span>
          <h3>Jeden významový hrdina</h3>
          <ul>
            {[...playbook.brandLock.composition, ...playbook.brandLock.lighting].map(
              item => <li key={item}>{item}</li>,
            )}
          </ul>
        </article>
      </div>

      <div className="visual-format-grid" aria-label="Platformové formáty">
        {Object.values(playbook.platformFormats).map(format => (
          <article key={format.label}>
            <span>{format.aspectRatio}</span>
            <h3>{format.label}</h3>
            <strong>
              {format.width} × {format.height} px
            </strong>
            <p>{format.cropRule}</p>
          </article>
        ))}
      </div>

      <div className="visual-series-grid" aria-label="Recepty obsahových sérií">
        {playbook.seriesRecipes.map((recipe, index) => (
          <article key={recipe.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{recipe.label}</h3>
            <p>{recipe.hero}</p>
            <dl>
              <div>
                <dt>Úloha AI</dt>
                <dd>{recipe.aiRole}</dd>
              </div>
              <div>
                <dt>Kompozícia</dt>
                <dd>{recipe.composition}</dd>
              </div>
              <div>
                <dt>Nikdy</dt>
                <dd>{recipe.never}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="prompt-contract">
        <div>
          <p className="kicker">POVINNÝ CREATIVE BRIEF</p>
          <h3>Prompt má desať jasných častí</h3>
          <p>
            Reálne screenshoty, logo a text sa nikdy neprekresľujú modelom.
            Vytvoria sa alebo vložia deterministicky až po vygenerovaní
            samostatnej editoriálnej vrstvy.
          </p>
        </div>
        <ol>
          {playbook.promptTemplate.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <details className="prompt-example">
        <summary>Ukážkový Rise prompt a negative prompt</summary>
        <div>
          <pre>{playbook.examplePrompt}</pre>
          <section>
            <strong>Negative prompt</strong>
            <p>{playbook.negativePrompt}</p>
          </section>
        </div>
      </details>

      <div className="visual-source-grid" aria-label="Vizuálne zdroje a normy">
        {playbook.sources.map(source => (
          <a href={source.url} key={source.id} target="_blank" rel="noreferrer">
            <span>{source.label} ↗</span>
            <small>{source.role}</small>
            <em>
              Kontrola {source.checkedAt} · platnosť {source.expiresAt}
            </em>
          </a>
        ))}
      </div>
    </section>
  );
}
