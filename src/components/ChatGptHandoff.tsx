import Link from 'next/link';

import {
  PUBLIC_CHATGPT_CONTEXT,
  PUBLIC_STARTER_PACK,
} from '@/public/visualSystem';
import { RiseLogoMark } from '@/components/RiseLogoMark';

export function ChatGptHandoff() {
  const context = PUBLIC_CHATGPT_CONTEXT;

  return (
    <main className="handoff-shell">
      <header className="handoff-header">
        <a className="handoff-brand" href="https://rise.sk/">
          <RiseLogoMark className="handoff-logo" />
          <span>
            <strong>RISE.SK</strong>
            <small>ChatGPT brand context</small>
          </span>
        </a>
        <Link href="/content-plan/">90-dňový plán →</Link>
      </header>

      <section className="handoff-critical" aria-labelledby="identity-title">
        <p className="handoff-kicker">Povinné pred každým návrhom alebo obrázkom</p>
        <h1 id="identity-title">
          Rise.sk je softvérová a produktová firma.
        </h1>
        <p className="handoff-lead">
          Nie sme stavebná firma, developer nehnuteľností ani realitná
          kancelária. MapaTrhu je <strong>dátový softvérový produkt</strong>,
          nie ponuka domov alebo bytov.
        </p>
        <div className="handoff-stop" role="note">
          <strong>Žiadosť o prvé obrázky?</strong>
          <span>
            Vráť iba schválené médiá zo starter packu. Kým je prázdny,
            zastav a negeneruj náhradný vizuál.
          </span>
        </div>
      </section>

      <section className="handoff-grid" aria-label="Povinný brand contract">
        <article>
          <p className="handoff-index">01 / Produktový dôkaz</p>
          <h2>Reálne UI. Pravé logo. Presný layout.</h2>
          <p>
            Finálny vizuál skladá kontrolovaný renderer z approved asset ID,
            Playfair Display, Interu a Rise tokenov. Image model negeneruje
            produkt, UI, text, logo ani hlavný vizuál prvých štyroch týždňov.
          </p>
        </article>
        <article>
          <p className="handoff-index">02 / Vizuálny smer</p>
          <h2>Tmavý produktový priestor, teplé zlato.</h2>
          <p>
            Canvas #080807, povrchy #0C0C0C a #141414, Rise gold #DAB549,
            text #F8F4EC. Formát 1080 × 1350 px, safe zóna 84 px.
          </p>
        </article>
        <article>
          <p className="handoff-index">03 / Nikdy</p>
          <h2>Žiadne AI a realitné klišé.</h2>
          <p>
            Bez domov, bytov, stavebných vizualizácií, realitného stocku,
            modro-fialového cyberpunku, robotov, fake UI, syntetických ľudí,
            generovaného textu alebo loga.
          </p>
        </article>
      </section>

      <section className="handoff-products" aria-labelledby="products-title">
        <div>
          <p className="handoff-kicker">Štyri vlastné produkty</p>
          <h2 id="products-title">Jeden tím od návrhu po prevádzku.</h2>
        </div>
        <ol>
          {context.products.map(product => (
            <li key={product.id}>
              <span>{product.name}</span>
              <p>{product.definition}</p>
              <a href={product.sourceUrl}>Otvoriť presnú case study ↗</a>
            </li>
          ))}
        </ol>
      </section>

      <section className="handoff-preflight" aria-labelledby="preflight-title">
        <div>
          <p className="handoff-kicker">Preflight</p>
          <h2 id="preflight-title">Bez tohto sa nerenderuje.</h2>
        </div>
        <ol>
          {context.preflight.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="handoff-contracts" aria-labelledby="contracts-title">
        <div>
          <p className="handoff-kicker">Kanonické verejné rozhrania</p>
          <h2 id="contracts-title">Načítaj kontext, potom assety.</h2>
          <p>
            Starter pack je teraz{' '}
            <strong>
              {PUBLIC_STARTER_PACK.status === 'approved'
                ? 'schválený'
                : 'bez vizuálneho schválenia'}
            </strong>
            . Draft sa verejne nikdy neserializuje ako hotové médium.
          </p>
        </div>
        <nav aria-label="Strojové kontrakty">
          <Link href="/chatgpt-context.json">
            chatgpt-context.json <span>Najprv</span>
          </Link>
          <Link href="/chatgpt-context.md">chatgpt-context.md</Link>
          <Link href="/visual-assets.json">visual-assets.json</Link>
          <Link href="/visual-playbook.json">visual-playbook.json</Link>
          <Link href="/starter-pack.json">starter-pack.json</Link>
        </nav>
      </section>

      <footer className="handoff-footer">
        <span>Rise Social Studio · public read-only</span>
        <Link href="/content-plan/">Otvoriť 90-dňový content plán →</Link>
      </footer>
    </main>
  );
}
