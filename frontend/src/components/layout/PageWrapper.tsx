import { ReactNode } from 'react';

export default function PageWrapper({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 overflow-y-auto pb-24 pw-page ${className}`}
    >
      {children}
    </div>
  );
}
