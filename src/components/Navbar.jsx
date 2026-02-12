import { useState, useEffect } from 'react';
import { Home, ClipboardList, History, User } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Tests', icon: ClipboardList },
  { path: '/history', label: 'History', icon: History },
  { path: '/profile', label: 'Profile', icon: User },
];

function usePathname(controlledPathname) {
  const [pathname, setPathname] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    if (controlledPathname !== undefined) return;
    if (typeof window === 'undefined') return;
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [controlledPathname]);

  return controlledPathname !== undefined ? controlledPathname : pathname;
}

function NavLink({ item, isActive, isMobile }) {
  const Icon = item.icon;
  const base = 'flex items-center justify-center gap-1.5 transition-colors';
  const active = isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

  if (isMobile) {
    return (
      <a
        href={item.path}
        className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-0 flex-1 rounded-lg ${active}`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
        <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
      </a>
    );
  }

  return (
    <a
      href={item.path}
      className={`${base} px-4 py-2 rounded-lg font-medium text-sm ${active}`}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
      {item.label}
    </a>
  );
}

export default function Navbar({ pathname: pathnameProp } = {}) {
  const pathname = usePathname(pathnameProp);

  return (
    <>
      {/* Desktop: top header (md and up) */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between px-4 bg-white border-b border-slate-200">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-slate-900">TyariWale</span>
        </a>
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
      </header>

      {/* Mobile: bottom tab bar (default, below md) */}
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
      <div className="h-0 md:h-14" aria-hidden="true" />
      <div className="h-16 md:h-0" aria-hidden="true" />
    </>
  );
}
