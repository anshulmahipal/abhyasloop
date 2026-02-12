import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, History, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Tests', icon: ClipboardList },
  { path: '/history', label: 'History', icon: History },
  { path: '/profile', label: 'Profile', icon: User },
];

function NavLink({ item, isActive, isMobile }) {
  const Icon = item.icon;
  const active = isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

  if (isMobile) {
    return (
      <Link
        to={item.path}
        className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-0 flex-1 rounded-lg ${active}`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
        <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={item.path}
      className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${active}`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
      {item.label}
    </Link>
  );
}

export default function Navbar({ pathname: pathnameProp } = {}) {
  const location = useLocation();
  const pathname = pathnameProp !== undefined ? pathnameProp : location.pathname;
  const { user } = useAuth();

  const authCta = user ? (
    <Link
      to="/dashboard"
      className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
    >
      Go to Dashboard
    </Link>
  ) : (
    <>
      <Link
        to="/login"
        className="text-slate-700 hover:text-slate-900 font-semibold text-sm transition-colors"
      >
        Login
      </Link>
      <Link
        to="/signup"
        className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-sm"
      >
        Get Started
      </Link>
    </>
  );

  return (
    <>
      {/* Desktop: top header (md and up) */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between px-4 bg-white border-b border-slate-200">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-slate-900">TyariWale</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              isActive={pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))}
              isMobile={false}
            />
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {authCta}
        </div>
      </header>

      {/* Mobile: top bar with logo + auth CTA, then bottom tab bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 bg-white border-b border-slate-200">
        <Link to="/" className="text-lg font-bold text-slate-900">TyariWale</Link>
        <div className="flex items-center gap-2">
          {authCta}
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-white border-t border-slate-200 safe-area-pb">
        <div className="flex flex-1 items-stretch justify-around w-full max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              isActive={pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))}
              isMobile={true}
            />
          ))}
        </div>
      </nav>

      {/* Spacer so content isn’t hidden under fixed nav */}
      <div className="h-12 md:h-14" aria-hidden="true" />
      <div className="h-16 md:h-0" aria-hidden="true" />
    </>
  );
}
