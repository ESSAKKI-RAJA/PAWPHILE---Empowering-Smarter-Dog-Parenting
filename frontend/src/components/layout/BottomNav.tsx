import { NavLink } from 'react-router-dom';
import { Home, Brain, FileText, User, ShieldAlert } from 'lucide-react';

const ITEMS = [
  { label: 'Home',     path: '/dashboard', icon: Home },
  { label: 'PAW AI',   path: '/paw-ai',    icon: Brain },
  { label: 'Care',     path: '/preventive-care', icon: ShieldAlert },
  { label: 'Reports',  path: '/reports',   icon: FileText },
  { label: 'Profile',  path: '/profile',   icon: User },
];

export default function BottomNav() {
  return (
    <nav
      className="md:hidden flex-shrink-0 flex items-stretch z-50"
      style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {ITEMS.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `pw-bottom-item ${isActive ? 'active' : ''}`
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
