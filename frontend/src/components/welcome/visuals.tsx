import { Activity, BellRing, FileCheck2, HeartHandshake, LineChart, Share2, ClipboardList, RefreshCcw } from 'lucide-react';

/** Product-native mini previews. All data is abstract and labeled DEMO.
 *  These are simplified renderings of real UI shapes, not screenshots. */

export function DemoTag() {
  return (
    <span className="pw-demo-tag">
      Demo illustration
    </span>
  );
}

const JOURNEY = [
  { icon: ClipboardList, label: 'Record', sub: 'Owner-recorded' },
  { icon: LineChart, label: 'Pattern', sub: 'Personal history' },
  { icon: Activity, label: 'Guidance', sub: 'With safety bounds' },
  { icon: Share2, label: 'Report', sub: 'Vet-ready' },
  { icon: BellRing, label: 'Reminder', sub: 'Preventive care' },
];

export function JourneyStrip() {
  return (
    <figure className="pw-journey" aria-label="Example journey through PAWPHILE">
      <DemoTag />
      <ol>
        {JOURNEY.map((s, i) => (
          <li key={s.label}>
            <span className="pw-journey-node" aria-hidden="true">
              <s.icon size={18} strokeWidth={2} />
            </span>
            <span className="pw-journey-label">{s.label}</span>
            <span className="pw-journey-sub">{s.sub}</span>
            {i < JOURNEY.length - 1 && <span className="pw-journey-link" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </figure>
  );
}

const DOTS = [0, 1, 0, 2, 1, 3, 2, 6, 5, 7, 6, 8];

export function IntelDemo() {
  return (
    <figure className="pw-intel" aria-label="Example change detection illustration">
      <DemoTag />
      <div className="pw-intel-plot" aria-hidden="true">
        <div className="pw-intel-band" />
        {DOTS.map((h, i) => (
          <span
            key={i}
            className={`pw-intel-dot${i === 7 ? ' is-flag' : ''}`}
            style={{ bottom: `${12 + h * 6}%`, left: `${6 + i * 7.5}%` }}
          />
        ))}
        <span className="pw-intel-flagline" />
      </div>
      <figcaption>
        <strong>Personal baseline</strong> from this dog&rsquo;s own history. A sustained
        move gets flagged with its evidence, never with a diagnosis.
      </figcaption>
      <ul className="pw-intel-evidence">
        <li>Baseline: 12 weeks of owner records</li>
        <li>Flag: sustained move, 2+ readings</li>
        <li>Next step: a clearer vet conversation</li>
      </ul>
    </figure>
  );
}

const LOOP = [
  'Owner record',
  'PAWPHILE analysis',
  'Vet preparation',
  'Owner review',
  'Controlled share',
  'Veterinary review',
  'Vet note and feedback',
  'Follow-up',
  'New health event',
  'Timeline grows',
];

export function LoopFlow() {
  return (
    <ol className="pw-loop" aria-label="The veterinary continuity loop">
      {LOOP.map((label, i) => (
        <li key={label}>
          <span className="pw-loop-dot" aria-hidden="true">{i + 1}</span>
          <span>{label}</span>
        </li>
      ))}
      <li className="pw-loop-return" aria-hidden="true">
        <RefreshCcw size={16} strokeWidth={2} />
        <span>the loop continues</span>
      </li>
    </ol>
  );
}

const SPOKES = ['Veterinarian', 'Clinic', 'Lab', 'Imaging', 'Device', 'Partner'];

export function EcoHub() {
  return (
    <div className="pw-hub" role="img" aria-label="PAWPHILE record at the center, connected to veterinarian, clinic, lab, imaging, device and partner through consent and authorization">
      <div className="pw-hub-center">
        <HeartHandshake size={22} strokeWidth={2} />
        <span>PAWPHILE record</span>
      </div>
      <ul>
        {SPOKES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="pw-hub-gates">Every connection passes consent, authorization, provenance and normalization.</p>
    </div>
  );
}

const PIPE = ['Data', 'Evidence', 'PAW AI', 'Explanation', 'Human decision'];

export function AiPipe() {
  return (
    <ol className="pw-pipe" aria-label="How PAW AI works">
      {PIPE.map((label, i) => (
        <li key={label}>
          <span>{label}</span>
          {i === 2 && <FileCheck2 size={16} strokeWidth={2} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
