import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '[DB]' },
  { to: '/cluster', label: 'Cluster', icon: '[CL]' },
  { to: '/topics', label: 'Topics', icon: '[T]' },
  { to: '/consumers', label: 'Consumer Groups', icon: '[CG]' },
  { to: '/metrics', label: 'Metrics', icon: '[M]' },
  { to: '/analysis', label: 'Data Analysis', icon: '[DA]' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-badge">W</div>
        <div>
          wave
          <span style={{ color: 'var(--accent)' }}>-ui</span>
        </div>
      </div>
      <nav className="nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
