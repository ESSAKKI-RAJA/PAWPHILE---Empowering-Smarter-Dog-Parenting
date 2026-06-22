import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Activity, UtensilsCrossed, Settings as SettingsIcon,
  Eye, MapPin, FileText, Scale, Footprints, User, Brain,
  Shield, Newspaper
} from 'lucide-react';
import BottomNav from './BottomNav';
import ToastHost from '../ui/ToastHost';
import { usePawphileData } from '../../context/PawphileDataContext';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const NAV_ITEMS = [
  { label: 'Home',            path: '/dashboard',        icon: Home },
  { label: 'PAW AI',          path: '/paw-ai',           icon: Brain },
  { label: 'Triage',          path: '/triage',           icon: Activity },
  { label: 'Nutrition',       path: '/nutrition',        icon: UtensilsCrossed },
  { label: 'Preventive Care', path: '/preventive-care',  icon: Shield },
  { label: 'BCS / BMI',       path: '/bmi',              icon: Scale },
  { label: 'Behavior',        path: '/behavior',         icon: Footprints },
  { label: 'Vision Scan',     path: '/vision',           icon: Eye },
  { label: 'PAWNEWS',         path: '/pawnews',          icon: Newspaper },
  { label: 'Vet Locator',     path: '/vet-locator',      icon: MapPin },
  { label: 'Reports',         path: '/reports',          icon: FileText },
  { label: 'Profile',         path: '/profile',          icon: User },
  { label: 'Settings',        path: '/settings',         icon: SettingsIcon },
];

function SidebarLink({ path, icon: Icon, label }: { path: string; icon: React.ComponentType<any>; label: string }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) => `pw-nav-link ${isActive ? 'active' : ''}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedDog } = usePawphileData();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  // Use dog photo if available, otherwise show logo
  const logoSrc = selectedDog?.photoUrl || (selectedDog as any)?.imageUrl || null;

  return (
    <div className="h-screen w-full flex font-sans overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <ToastHost />

      {/* ── Desktop Sidebar ──────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-56 lg:w-64 flex-shrink-0 overflow-y-auto hide-scrollbar"
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >
        {/* Brand Lockup */}
        <div
          className="px-4 py-5 cursor-pointer flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-glow)' }}>
            {logoSrc ? (
              <img src={logoSrc} alt={selectedDog?.name || 'PAWPHILE'}
                className="w-full h-full object-cover" />
            ) : (
              <img
                src="/assets/pawphile-logo.jpeg"
                alt="PAWPHILE"
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
          <div>
            <p className="text-base font-black leading-none tracking-tight" style={{ color: 'var(--text)' }}>PAWPHILE</p>
            <p className="text-[10px] font-semibold mt-0.5 leading-none" style={{ color: 'var(--teal)' }}>For who you Love.</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.path} path={item.path} icon={item.icon} label={item.label} />
          ))}
        </nav>

        {/* Auth / Disclaimer */}
        <div className="px-4 py-3 flex-shrink-0 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Account</span>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full pw-btn-teal px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                  Sign In / Sync
                </button>
              </SignInButton>
            </SignedOut>
          </div>
          <p className="text-[10px] font-semibold leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Not a diagnostic tool. Always consult a licensed veterinarian.
          </p>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isDashboard && (
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute top-4 right-4 z-[60] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border-2)',
              color: 'var(--text-2)',
            }}
          >
            ← Dashboard
          </button>
        )}

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
