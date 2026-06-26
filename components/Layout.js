import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabase"

export default function Layout({ children }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [overdueCount, setOverdueCount] = useState(0)

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/priorities", label: "Priorities", icon: "📋" },
    {href: "/calendar", label: "Calendar", icon: "📅"},
    { href: "/quarters", label: "Quarters", icon: "📅" },
    { href: "/users", label: "Team", icon: "👥" },
    { href: "/annual", label: "Annual", icon: "🎯" },
  ]

  useEffect(() => {
    loadOverdueCount()
    const interval = setInterval(loadOverdueCount, 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadOverdueCount() {
    const today = new Date().toISOString().split("T")[0]
    const { data } = await supabase
      .from("action_items")
      .select("id")
      .lt("due_date", today)
      .neq("status", "Complete")
    setOverdueCount(data?.length || 0)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push("/search?q=" + encodeURIComponent(searchQuery.trim()))
      setSearchQuery("")
    }
  }

  function logout() {
    localStorage.removeItem("aw_auth")
    router.push("/")
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      <nav style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📡</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9" }}>Alpha Wireless</span>
          </Link>
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 400, margin: "0 32px", display: "flex" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search... (press Enter)" style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 14 }} />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
            </div>
          </form>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navItems.map(item => {
              const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + "/")
              return (
                <Link key={item.href} href={item.href} style={{ padding: "8px 12px", borderRadius: 6, textDecoration: "none", color: isActive ? "#f1f5f9" : "#94a3b8", background: isActive ? "#334155" : "transparent", fontSize: 14, fontWeight: isActive ? 600 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <Link 
              href="/overdue" 
              style={{ 
                padding: "8px 12px", 
                borderRadius: 6, 
                textDecoration: "none", 
                color: router.pathname === "/overdue" ? "#f1f5f9" : overdueCount > 0 ? "#fca5a5" : "#94a3b8", 
                background: router.pathname === "/overdue" ? "#334155" : overdueCount > 0 ? "rgba(239,68,68,0.2)" : "transparent", 
                fontSize: 14, 
                fontWeight: overdueCount > 0 ? 600 : 400, 
                display: "flex", 
                alignItems: "center", 
                gap: 6,
                border: overdueCount > 0 ? "1px solid #ef4444" : "none"
              }}
            >
              <span>⚠️</span>
              <span>Overdue</span>
              {overdueCount > 0 && (
                <span style={{ 
                  background: "#ef4444", 
                  color: "#fff", 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: "2px 6px", 
                  borderRadius: 10,
                  marginLeft: 4
                }}>{overdueCount}</span>
              )}
            </Link>
            <button onClick={logout} style={{ marginLeft: 8, padding: "8px 12px", borderRadius: 6, border: "none", background: "transparent", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>🚪 Logout</button>
          </div>
        </div>
      </nav>
      
      {/* Overdue Alert Banner */}
      {overdueCount > 0 && router.pathname !== "/overdue" && (
        <div style={{ 
          background: "linear-gradient(90deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))", 
          borderBottom: "1px solid #ef4444", 
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12
        }}>
          <span style={{ color: "#fca5a5", fontSize: 14 }}>⚠️ You have {overdueCount} overdue action item{overdueCount !== 1 ? "s" : ""}</span>
          <button 
            onClick={() => router.push("/overdue")} 
            style={{ 
              background: "#ef4444", 
              color: "#fff", 
              border: "none", 
              padding: "6px 12px", 
              borderRadius: 6, 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: "pointer" 
            }}
          >View Overdue Items</button>
        </div>
      )}
      
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>{children}</main>
    </div>
  )
}
