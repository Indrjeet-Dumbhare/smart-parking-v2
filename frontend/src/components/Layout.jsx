import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSlotsContext } from '../context/SlotsContext.jsx';

const TITLES = {
  '/': 'SMART PARKING MANAGEMENT',
  '/guard': 'RESERVATIONS',
  '/guard/activity': 'ACTIVITY',
  '/guard/login': 'GUARD LOGIN',
};

function NavItem({ to, icon, color, children }) {
  return (
    <NavLink to={to} end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
      <span className={`icon ${color}`}>{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { token, username, logout } = useAuth();
  const { connected } = useSlotsContext();
  const { pathname } = useLocation();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div>SMART PARKING</div>
          <span>MANAGEMENT SYSTEM</span>
        </div>

        <nav>
          <NavItem to="/" icon="▦" color="icon--light">
            Dashboard
          </NavItem>
          {token ? (
            <>
              <NavItem to="/guard" icon="▣" color="icon--red">
                Reservations
              </NavItem>
              <NavItem to="/guard/activity" icon="▤" color="icon--amber">
                Activity
              </NavItem>
              <button className="nav-item" onClick={logout}>
                <span className="icon icon--slate">⏻</span>
                <span>Log out</span>
              </button>
            </>
          ) : (
            <NavItem to="/guard/login" icon="♟" color="icon--amber">
              Guard login
            </NavItem>
          )}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{TITLES[pathname] || 'SMART PARKING MANAGEMENT'}</h1>
          <div className="system-status" role="status">
            <span className={connected ? 'online-dot' : 'online-dot online-dot--off'} />
            {connected ? 'SYSTEM READY' : 'RECONNECTING'}
            <strong>♟ &nbsp; {token ? (username || 'GUARD').toUpperCase() : 'VISITOR'}</strong>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
