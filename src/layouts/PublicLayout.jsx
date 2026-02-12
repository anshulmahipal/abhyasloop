import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Layout for marketing and auth pages. No bottom tab bar.
 * Simple top navbar (Logo + Login/Get Started) on mobile and desktop.
 */
export default function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between px-4 bg-white border-b border-slate-200">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-slate-900">TyariWale</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
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
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
