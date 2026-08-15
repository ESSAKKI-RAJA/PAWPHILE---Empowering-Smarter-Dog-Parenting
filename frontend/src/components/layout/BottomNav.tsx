import { NavLink } from 'react-router-dom';
import { Home, Brain, ShieldAlert, Activity, Camera } from 'lucide-react';

const ITEMS = [
  { label: 'Home',     path: '/dashboard',       icon: Home },
  { label: 'Timeline', path: '/timeline',        icon: Activity },
  { label: 'PAW AI',   path: '/paw-ai',          icon: Brain },
  { label: 'Scan',     path: '/vision',          icon: Camera },
  { label: 'Care',     path: '/preventive-care', icon: ShieldAlert },
];

export default function BottomNav() {
  return (
    <nav
      className="md:hidden flex-shrink-0 flex items-stretch z-50 bg-white border-t border-line-200"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {ITEMS.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-primary' : 'text-muted-400 hover:text-ink-950'
            }`
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
