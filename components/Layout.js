import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const router = useRouter()
  const nav = [
    { section: 'Main' },
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/annual', icon: '🎯', label: 'Annual Priorities' },
    { section: 'Planning' },
    { href: '/priorities', icon: '📋', label: 'Priorities' },
    { href: '/quarters', icon: '📅', label: 'Quarters' },
    { href: '/reviews', icon: '🔍', label: 'Quarterly Reviews' },
    { section: 'Meetings' },
    { href: '/meetings', icon: '🤝', label: 'Meetings' },
    { section: 'Team' },
    { href: '/users', icon: '👥', label: 'Team Members' },
  ]
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Alpha Wireless</h2>
          <p>Priority Tracker v2</p>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section">{item.section}</div>
            ) : (
              <div
                key={i}
                className={"nav-item" + (router.pathname === item.href || router.pathname.startsWith(item.href + "/") ? " active" : "")}
                onClick={() => router.push(item.href)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )
          )}
        </nav>
        <div className="sidebar-footer">Alpha Wireless © 2026</div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
