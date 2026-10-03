import { useEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Scroll-reveal wrapper. Uses IntersectionObserver (never scroll listeners).
 *  Content is always rendered; only the entrance transition is gated. */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    el.classList.add('rv');
    if (delay > 0) el.style.transitionDelay = `${delay}ms`;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, delay]);

  return (
    <Tag ref={ref as never} className={`${reduced ? 'is-visible' : ''} ${className}`}>
      {children}
    </Tag>
  );
}
