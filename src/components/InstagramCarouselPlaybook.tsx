import { PUBLIC_INSTAGRAM_CAROUSEL_PLAYBOOK } from '@/public/visualSystem';

export function InstagramCarouselPlaybook() {
  const playbook = PUBLIC_INSTAGRAM_CAROUSEL_PLAYBOOK;
  return (
    <>
      <section className="carousel-playbook-hero">
        <p className="kicker">APP CASE STUDY · 1080 × 1350</p>
        <h1>Aplikácia ako krátky produktový príbeh.</h1>
        <p>
          Sedem jasných slidov, originálne Rise aktíva, reálne UI a iba
          verejne podložené tvrdenia. Ak chýba dôkaz, príbeh sa skráti — nikdy
          nevypĺňa.
        </p>
        <div className="carousel-spec-row" aria-label="Základné parametre">
          <span>4 : 5</span>
          <span>84 px safe zone</span>
          <span>6–7 slidov</span>
          <span>390 px kontrola</span>
        </div>
      </section>

      <section className="carousel-story" aria-labelledby="story-heading">
        <div className="carousel-section-copy">
          <p className="kicker">NARATÍV</p>
          <h2 id="story-heading">Jedna otázka na jeden slide.</h2>
          <p>
            Produkt zostáva hrdinom. Text vysvetľuje problém, rozsah, tok,
            detail, rozhodnutie a dôkaz.
          </p>
        </div>
        <ol className="carousel-story-grid">
          {playbook.narrative.map((slide, index) => (
            <li key={slide.role} data-role={slide.role}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <small>{slide.role}</small>
              <h3>{slide.question}</h3>
              <p>{slide.evidence}</p>
              {!slide.required ? <em>Voliteľný pri 6 slidoch</em> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="carousel-rules">
        <article>
          <p className="kicker">TEXT</p>
          <h2>Krátko a konkrétne.</h2>
          <ul>
            <li>Cover 3–7 slov, najviac dva riadky.</li>
            <li>Obsahový headline 2–7 slov.</li>
            <li>Body 8–24 slov, najviac dve vety.</li>
            <li>Najviac 30 slov na celý slide.</li>
            <li>Najviac tri callouty po 2–4 slovách.</li>
          </ul>
        </article>
        <article>
          <p className="kicker">PRODUKT</p>
          <h2>UI sa nevymýšľa.</h2>
          <ul>
            <li>Najmenej jeden produktový celok a jeden funkčný detail.</li>
            <li>Najviac jeden rovný device frame.</li>
            <li>Žiadna perspektívna deformácia ani generované obrazovky.</li>
            <li>Renderuje sa iba asset so stavom approved.</li>
            <li>Každý text nesie platný claim ID.</li>
          </ul>
        </article>
        <article>
          <p className="kicker">BRAND</p>
          <h2>Pokojný a presný.</h2>
          <div className="carousel-palette" aria-label="Rise paleta">
            {Object.entries(playbook.palette)
              .filter(([, value]) => value.startsWith('#'))
              .map(([name, value]) => (
                <span key={name} style={{ backgroundColor: value }}>
                  <small>{name}</small>
                </span>
              ))}
          </div>
          <p>
            Playfair Display iba na nosný titulok. Inter na všetko funkčné.
            Zlato je navigačný akcent.
          </p>
        </article>
      </section>

      <section className="carousel-contract">
        <p className="kicker">CHATGPT WORKFLOW</p>
        <h2>Najprv zdroj. Potom vizuál.</h2>
        <code>{playbook.loadOrder.join(' → ')}</code>
        <p>
          {playbook.promptContract}. Generatívny model môže vytvoriť iba
          oddelené abstraktné pozadie; logo, text, UI, metriky a ľudia sa
          skladajú z overených originálov.
        </p>
      </section>
    </>
  );
}
