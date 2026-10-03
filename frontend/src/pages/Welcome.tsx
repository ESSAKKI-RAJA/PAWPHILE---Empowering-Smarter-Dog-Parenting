import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus, PawPrint } from 'lucide-react';
import Reveal from '../components/welcome/Reveal';
import BrandLoader from '../components/welcome/BrandLoader';
import { JourneyStrip, IntelDemo, LoopFlow, EcoHub, AiPipe } from '../components/welcome/visuals';
import '../components/welcome/welcome.css';

const LOGO = '/assets/pawphile-logo.png';
const ENTER = 'Enter PAWPHILE';

function SkipLink() {
  return (
    <a href="#main" className="pw-skip">
      Skip to content
    </a>
  );
}

function Nav() {
  return (
    <header className="pw-nav">
      <div className="pw-nav-inner">
        <Link to="/welcome" className="pw-brand" aria-label="PAWPHILE home">
          <span className="pw-brand-badge" aria-hidden="true">
            <img src={LOGO} alt="" width={34} height={34} />
          </span>
          <span className="pw-brand-word">PAWPHILE</span>
        </Link>
        <nav className="pw-nav-links" aria-label="Page sections">
          <a href="#overview">Overview</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#veterinary">Veterinary</a>
          <a href="#ecosystem">Connections</a>
        </nav>
        <Link to="/dashboard" className="pw-nav-cta">
          {ENTER}
        </Link>
      </div>
    </header>
  );
}

const STEPS = [
  ['Record', 'Health events, measurements, symptoms and files become one timeline.'],
  ['Understand', 'Personal baselines and trends surface what changed, with evidence.'],
  ['Prepare', 'A vet-ready package is drafted from the record, gaps included.'],
  ['Review', 'You see exactly what would be shared, and edit before approving.'],
  ['Share', 'Scoped, purposed and expiring access. Nothing sends itself.'],
  ['Collaborate', 'The veterinarian reviews, notes and answers your questions.'],
  ['Follow up', 'Recommendations become reminders, then recorded outcomes.'],
  ['Continue', 'New events refresh the timeline and the intelligence.'],
];

const LAYERS = [
  {
    n: '01',
    name: 'Foundation',
    line: 'The trusted record underneath everything: identity, ownership, canonical health events, timeline, measurements, files, reports, reminders, consent, sharing, audit and export.',
    chips: ['Health events', 'Timeline', 'Measurements', 'Files', 'Reports', 'Reminders', 'Consent', 'Audit', 'Export'],
  },
  {
    n: '02',
    name: 'Longitudinal intelligence',
    line: 'Personal baselines, trends, completeness and change detection turn the record into understanding. Descriptive and evidence-linked, never a diagnosis.',
    chips: ['Baselines', 'Trends', 'Change detection', 'Evidence lineage', 'PAW AI'],
  },
  {
    n: '03',
    name: 'Veterinary continuity',
    line: 'Owner records become controlled collaboration: care team, scoped shares, immutable vet packages, consultations, notes, follow-ups and full access history.',
    chips: ['Care team', 'Vet packages', 'Consultations', 'Notes', 'Follow-ups', 'Access history'],
  },
  {
    n: '04',
    name: 'Ecosystem',
    line: 'Structured connections to clinics, labs, imaging, devices and partners through consent, authorization and provenance. Integration-ready, honestly labeled.',
    chips: ['Organizations', 'Professional identity', 'Labs', 'Devices', 'Partner API', 'Webhooks', 'Emergency continuity'],
  },
];

const TRUST = [
  ['Owner control', 'You decide what is shared, with whom, for what purpose and for how long. Revocation is immediate.'],
  ['Consent first', 'Analysis, sharing and integrations each need explicit consent. Withdrawal blocks what comes next.'],
  ['Provenance', 'Every fact keeps its source: owner, veterinarian, clinic, import, device, lab, system or AI-derived.'],
  ['Human oversight', 'PAWPHILE prepares conversations with veterinarians. It does not replace them.'],
  ['No diagnosis claims', 'Patterns are described with evidence. Diseases are never stated, and treatment is never prescribed.'],
  ['Auditable access', 'Who saw what, when, for what purpose and until when. The owner can inspect it all.'],
];

const NOTDO = [
  'An AI veterinarian',
  'A diagnosis engine',
  'A treatment authority',
  'A full clinic ERP',
  'An unrestricted data marketplace',
];

const CAPS: Array<[string, string[]]> = [
  ['Record', ['Pet profile', 'Health events', 'Timeline', 'Measurements', 'Files', 'Reports']],
  ['Intelligence', ['Baselines', 'Trends', 'Change detection', 'Evidence lineage', 'PAW AI']],
  ['Veterinary', ['Care team', 'Sharing', 'Vet packages', 'Consultations', 'Notes', 'Follow-ups']],
  ['Ecosystem', ['Organizations', 'Professional identity', 'Integrations', 'Labs', 'Imaging', 'Devices', 'Partner API', 'Webhooks', 'Interoperability', 'Emergency continuity']],
  ['Trust', ['Consent', 'Authorization', 'Audit', 'Provenance', 'Revocation', 'Data export']],
];

const ARCH = ['App', 'API', 'Services', 'PostgreSQL', 'Health events', 'Intelligence', 'Continuity', 'Adapters'];

export default function Welcome() {
  const [ready, setReady] = useState(false);

  return (
    <div className="pw-welcome">
      <SkipLink />
      {!ready && <BrandLoader onDone={() => setReady(true)} />}
      <Nav />
      <main id="main">
        {/* ── Hero ── */}
        <section className="pw-section pw-hero" aria-labelledby="hero-h">
          <div className="pw-wrap pw-hero-grid">
            <Reveal>
              <p className="pw-eyebrow">Owner-controlled canine health continuity</p>
              <h1 id="hero-h" className="pw-h-display">
                Your dog&rsquo;s health story, connected.
              </h1>
              <p className="pw-hero-sub">
                PAWPHILE keeps records, patterns, vet care and follow-ups in one continuous story you control.
              </p>
              <div className="pw-hero-ctas">
                <Link to="/dashboard" className="pw-btn-primary">
                  {ENTER}
                </Link>
                <a href="#how" className="pw-btn-ghost">
                  See how it works
                </a>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <JourneyStrip />
            </Reveal>
          </div>
        </section>

        {/* ── Problem band ── */}
        <section id="overview" className="pw-band" aria-labelledby="problem-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="problem-h" className="pw-band-quote">
                Health information scatters across memory, paper, photos, messages and clinic files. PAWPHILE keeps the story connected.
              </h2>
              <p className="pw-lede">One longitudinal record instead of fragments. Every later capability, from baselines to vet handoffs, reads from the same source of truth.</p>
              <div className="pw-scatter" aria-label="Fragmented sources PAWPHILE unifies">
                {['Memory', 'Paper files', 'Phone photos', 'Chat messages', 'Clinic printouts', 'Reminder apps'].map((s) => (
                  <span key={s}>{s}</span>
                ))}
                <span><strong>→ one continuous record</strong></span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="pw-section" aria-labelledby="how-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="how-h" className="pw-h-section">How PAWPHILE works</h2>
              <p className="pw-lede">Eight stages, one loop. The owner reviews before anything is shared, and every follow-up returns to the record.</p>
            </Reveal>
            <div className="pw-rail">
              {STEPS.map(([title, body], i) => (
                <Reveal key={title} delay={Math.min(i, 4) * 60}>
                  <div className="pw-step">
                    <span className="pw-step-num">0{i + 1}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Four layers ── */}
        <section id="layers" className="pw-section" aria-labelledby="layers-h">
          <div className="pw-wrap">
            <Reveal>
              <p className="pw-eyebrow">Four layers, one system</p>
              <h2 id="layers-h" className="pw-h-section">What has been built</h2>
              <p className="pw-lede">Each layer rests on the one below. Nothing here is a separate product or a mockup.</p>
            </Reveal>
            <div className="pw-layers">
              {LAYERS.map((l) => (
                <Reveal key={l.n}>
                  <div className="pw-layer">
                    <span className="pw-layer-num" aria-hidden="true">{l.n}</span>
                    <div>
                      <h3>
                        {l.name}
                        <span className="pw-layer-status">Complete</span>
                      </h3>
                      <p>{l.line}</p>
                      <ul className="pw-chips" aria-label={`${l.name} includes`}>
                        {l.chips.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Intelligence ── */}
        <section id="intelligence" className="pw-section" aria-labelledby="intel-h">
          <div className="pw-wrap pw-split">
            <Reveal>
              <IntelDemo />
            </Reveal>
            <Reveal delay={100}>
              <h2 id="intel-h" className="pw-h-section">Understand changes across time</h2>
              <p className="pw-lede">PAWPHILE compares each dog against its own history and explains what it found, with the records attached.</p>
              <ul className="pw-checks">
                {[
                  ['Personal baselines', 'Normals are learned from this dog, never from breed averages.'],
                  ['Described change', 'A sustained move is flagged with magnitude, period and evidence.'],
                  ['Honest gaps', 'Thin records say so plainly instead of guessing.'],
                  ['Better questions', 'The output is built for the next vet conversation.'],
                ].map(([t, b]) => (
                  <li key={t}>
                    <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span><strong>{t}. </strong>{b}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Veterinary loop ── */}
        <section id="veterinary" className="pw-section" aria-labelledby="vet-h">
          <div className="pw-wrap pw-split">
            <Reveal>
              <h2 id="vet-h" className="pw-h-section">A loop, not a handoff</h2>
              <p className="pw-lede">The owner prepares, reviews and approves. The veterinarian reviews, notes and recommends. Outcomes return to the timeline, and the story continues.</p>
              <ul className="pw-checks">
                {[['Scoped sharing', 'Purpose, scope and expiry on every grant. Report-only, selected or full record.'],
                  ['Immutable packages', 'The vet sees the exact frozen version the owner approved, with a digest.'],
                  ['Follow-ups that land', 'Recommendations become reminders, then recorded outcomes.'],
                ].map(([t, b]) => (
                  <li key={t}>
                    <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span><strong>{t}. </strong>{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 18 }}>
                <Link to="/veterinary" className="pw-btn-ghost">Open Veterinary Care</Link>
              </p>
            </Reveal>
            <Reveal delay={100}>
              <LoopFlow />
            </Reveal>
          </div>
        </section>

        {/* ── Ecosystem ── */}
        <section id="ecosystem" className="pw-section" aria-labelledby="eco-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="eco-h" className="pw-h-section">Connected, under control</h2>
              <p className="pw-lede">Clinics, labs, imaging, devices and partners connect through consent and authorization, with provenance preserved. Integration-ready means exactly that: ready, labeled, revocable.</p>
            </Reveal>
            <Reveal delay={80}>
              <div style={{ marginTop: 30 }}>
                <EcoHub />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p style={{ marginTop: 22 }}>
                <Link to="/connections" className="pw-btn-ghost">See Connections</Link>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── PAW AI ── */}
        <section id="paw-ai" className="pw-section" aria-labelledby="ai-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="ai-h" className="pw-h-section">PAW AI assists. Humans decide.</h2>
              <p className="pw-lede">Evidence-grounded help built around the longitudinal record: preparation, explanation and summaries. Labeled as generated, gated by consent, escalated to humans when it matters.</p>
            </Reveal>
            <Reveal delay={80}>
              <AiPipe />
            </Reveal>
            <Reveal delay={120}>
              <ul className="pw-chips pw-cap-chips" aria-label="PAW AI capabilities">
                {['Vet preparation', 'Follow-up explanation', 'Visit summaries', 'Integration explanation', 'Imported-record explanation', 'Data-gap explanation', 'Package explanation', 'Device summaries'].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── Trust ── */}
        <section id="trust" className="pw-section" aria-labelledby="trust-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="trust-h" className="pw-h-section">Why you can trust it</h2>
              <p className="pw-lede">Six principles, enforced in code and checked by tests, not just written here.</p>
            </Reveal>
            <ul className="pw-trust">
              {TRUST.map(([t, b]) => (
                <Reveal as="li" key={t}>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Not this ── */}
        <section className="pw-notdo" aria-labelledby="notdo-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="notdo-h" className="pw-h-section">PAWPHILE is not</h2>
              <ul className="pw-notdo-list">
                {NOTDO.map((t) => (
                  <li key={t}>
                    <Minus size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="pw-notdo-close">PAWPHILE improves continuity, understanding and collaboration. That restraint is the point.</p>
            </Reveal>
          </div>
        </section>

        {/* ── Capability map ── */}
        <section id="capabilities" className="pw-section" aria-labelledby="caps-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="caps-h" className="pw-h-section">Capability map</h2>
              <p className="pw-lede">Everything below is implemented and reachable inside the product today.</p>
            </Reveal>
            <Reveal delay={80}>
              <div className="pw-acc">
                {CAPS.map(([group, items]) => (
                  <details key={group}>
                    <summary>
                      {group}
                      <span className="pw-acc-icon" aria-hidden="true">+</span>
                    </summary>
                    <div className="pw-acc-body">
                      <ul>
                        {items.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Architecture ── */}
        <section id="architecture" className="pw-section" aria-labelledby="arch-h">
          <div className="pw-wrap">
            <Reveal>
              <h2 id="arch-h" className="pw-h-section">Under the hood</h2>
              <p className="pw-lede">A modular monolith with one canonical record at the center. Auditable, extensible, with no hidden machinery.</p>
            </Reveal>
            <Reveal delay={80}>
              <div className="pw-arch">
                <ol aria-label="System architecture flow">
                  {ARCH.map((a, i) => (
                    <li key={a}>
                      <span className={`pw-arch-chip${i >= 4 ? ' hl' : ''}`}>{a}</span>
                      {i < ARCH.length - 1 && (
                        <span className="pw-arch-arrow" aria-hidden="true">
                          →
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Maturity ── */}
        <section id="maturity" className="pw-section" aria-labelledby="mat-h">
          <div className="pw-wrap">
            <Reveal>
              <p className="pw-eyebrow">Where things stand</p>
              <h2 id="mat-h" className="pw-h-section">Core platform: implemented</h2>
              <p className="pw-lede">The platform below is built and tested. What comes next is validation in the real world, not more promises.</p>
            </Reveal>
            <div className="pw-mature">
              {[
                ['01 Foundation', 'Trusted longitudinal record'],
                ['02 Intelligence', 'Personal patterns with evidence'],
                ['03 Veterinary', 'Controlled collaboration loop'],
                ['04 Ecosystem', 'Structured, consented connections'],
              ].map(([t, s]) => (
                <Reveal key={t}>
                  <div className="pw-mature-row">
                    <div>
                      <strong>{t}</strong>
                      <div><span>{s}</span></div>
                    </div>
                    <span className="pw-done-pill">Complete</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal>
              <div className="pw-next">
                <h3 className="pw-h-section" style={{ fontSize: '1.25rem' }}>Next: meet the real world</h3>
                <ul>
                  <li>Owner validation and usability studies</li>
                  <li>Clinic pilots and veterinarian feedback</li>
                  <li>Integration pilots with labs and devices</li>
                  <li>Partner discovery and commercial hypothesis testing</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="enter" className="pw-section" aria-labelledby="cta-h">
          <div className="pw-wrap">
            <Reveal>
              <div className="pw-cta">
                <h2 id="cta-h">Start with your dog&rsquo;s story.</h2>
                <p>The record, the patterns, the vet conversations and the follow-ups are waiting in one calm place.</p>
                <Link to="/dashboard" className="pw-btn-primary">
                  {ENTER} <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" style={{ verticalAlign: -3 }} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="pw-footer">
        <div className="pw-wrap">
          <div className="pw-footer-mark">
            <span className="pw-footer-badge">
              <img src={LOGO} alt="PAWPHILE logo" width={96} height={96} loading="lazy" />
            </span>
            <p className="pw-footer-tag">Your dog&rsquo;s health story, connected.</p>
          </div>
          <div className="pw-footer-grid">
            <nav aria-label="Product">
              <h3>Product</h3>
              <ul>
                <li><Link to="/intelligence">Intelligence</Link></li>
                <li><Link to="/veterinary">Veterinary care</Link></li>
                <li><Link to="/connections">Connections</Link></li>
                <li><Link to="/timeline">Timeline</Link></li>
              </ul>
            </nav>
            <nav aria-label="Trust">
              <h3>Trust</h3>
              <ul>
                <li><Link to="/consent">Consent center</Link></li>
                <li><Link to="/share">Sharing</Link></li>
                <li><Link to="/export">Data export</Link></li>
                <li><a href="#trust">Safety principles</a></li>
              </ul>
            </nav>
            <nav aria-label="About">
              <h3>About</h3>
              <ul>
                <li><a href="#layers">What is built</a></li>
                <li><a href="#maturity">Roadmap honesty</a></li>
                <li><Link to="/auth">Sign in</Link></li>
                <li><Link to="/dashboard">{ENTER}</Link></li>
              </ul>
            </nav>
          </div>
          <div className="pw-footer-base">
            <span>© PAWPHILE. Awareness and preventive decision support only. Not a replacement for a veterinarian.</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PawPrint size={14} aria-hidden="true" /> Know them better. Care them better.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
