import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const LOGO = '/assets/pawphile-logo.png';

/** Branded entry loader: logo pulse, thin progress line, fast reveal.
 *  Reduced motion gets an instant static frame. Never blocks the app. */
export default function BrandLoader({ onDone }: { onDone: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const t1 = setTimeout(() => setLeaving(true), 950);
    const t2 = setTimeout(onDone, 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced, onDone]);

  if (reduced) return null;

  return (
    <div
      className={`pw-loader${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-label="Loading PAWPHILE"
    >
      <div className="pw-loader-badge">
        <img src={LOGO} alt="PAWPHILE logo" width={120} height={120} />
      </div>
      <p className="pw-loader-word">PAWPHILE</p>
      <p className="pw-loader-tag">Your dog&rsquo;s health story, connected.</p>
      <div className="pw-loader-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
