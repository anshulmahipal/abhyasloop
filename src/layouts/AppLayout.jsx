import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

/**
 * Layout for authenticated app (Dashboard, Tests, History, Profile).
 * Includes full Navbar: bottom tab bar on mobile, top/side nav on desktop.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
