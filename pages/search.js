import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Search() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState({ priorities: [], action_items: [], users: [], target_accounts: [] })
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    const q = router.query.q
    if (q) {
      setQuery(q)
      performSearch(q)
    }
  }, [router.query])

  async function performSearch(searchQuery) {
    if (!searchQuery.trim()) {
      setResults({ priorities: [], action_items: [], users: [], target_accounts: [] })
      setHasSearched(false)
      return
    }
    setSearching(true)
    setHasSearched(true)
    const searchTerm = `%${searchQuery.toLowerCase()}%`
    const [{ data: priorities }, { data: actionItems }, { data: users }, { data: accounts }] = await Promise.all([
      supabase.from("priorities").select("*").or(`title.ilike.${searchTerm},status.ilike.${searchTerm}`),
      supabase.from("action_items").select("*").or(`description.ilike.${searchTerm},status.ilike.${searchTerm}`),
      supabase.from("users").select("*").or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},role.ilike.${searchTerm}`),
      supabase.from("target_accounts").select("*").or(`name.ilike.${searchTerm},notes.ilike.${searchTerm}`),
    ])
    setResults({ priorities: priorities || [], action_items: actionItems || [], users: users || [], target_accounts: accounts || [] })
    setSearching(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    performSearch(query)
    router.push(`/search?q=${encodeURIComponent(query)}`, undefined, { shallow: true })
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  const totalResults = results.priorities.length + results.action_items.length + results.users.length + results.target_accounts.length

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">🔍 Global Search</div><div className="page-subtitle">Search across all data</div></div>
      </div>
      <div className="card" style={{marginBottom:24}}>
        <form onSubmit={handleSearch} style={{display:"flex",gap:12}}>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search priorities, action items, users, accounts..." style={{flex:1,padding:"12px 16px",fontSize:16,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#f1f5f9"}} />
          <button type="submit" className="btn btn-primary" style={{padding:"12px 24px"}}>Search</button>
        </form>
      </div>
      {searching && <div style={{color:"#64748b",padding:40,textAlign:"center"}}>Searching...</div>}
      {!searching && hasSearched && totalResults === 0 && (
        <div className="card"><div className="empty-state"><div className="empty-icon">🔍</div><div>No results found for "{query}"</div></div></div>
      )}
      {!searching && hasSearched && totalResults > 0 && (
        <div>
          <div style={{marginBottom:16,color:"#64748b"}}>Found {totalResults} result{totalResults !== 1 ? "s" : ""}</div>
          {results.priorities.length > 0 && (
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:"#64748b",marginBottom:12}}>📋 Priorities ({results.priorities.length})</div>
              <table>
                <thead><tr><th>Title</th><th>Status</th><th>Progress</th><th>Action</th></tr></thead>
                <tbody>
                  {results.priorities.map(p => (
                    <tr key={p.id}>
                      <td style={{fontWeight:500,color:"#f1f5f9"}}>{p.title}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>{p.overall_completion || 0}%</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => router.push("/priority/" + p.id)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results.action_items.length > 0 && (
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:"#64748b",marginBottom:12}}>✅ Action Items ({results.action_items.length})</div>
              <table>
                <thead><tr><th>Description</th><th>Status</th><th>Due Date</th><th>Progress</th><th>Action</th></tr></thead>
                <tbody>
                  {results.action_items.map(a => (
                    <tr key={a.id}>
                      <td style={{fontWeight:500,color:"#f1f5f9"}}>{a.description}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{a.due_date || "—"}</td>
                      <td>{a.completion_percentage || 0}%</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => router.push("/priority/" + a.priority_id)}>View Priority</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results.users.length > 0 && (
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:"#64748b",marginBottom:12}}>👥 Team Members ({results.users.length})</div>
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Action</th></tr></thead>
                <tbody>
                  {results.users.map(u => (
                    <tr key={u.id}>
                      <td style={{fontWeight:500,color:"#f1f5f9"}}>{u.full_name}</td>
                      <td>{u.role || "—"}</td>
                      <td>{u.email || "—"}</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => router.push("/users")}>View Team</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results.target_accounts.length > 0 && (
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:"#64748b",marginBottom:12}}>🏢 Target Accounts ({results.target_accounts.length})</div>
              <table>
                <thead><tr><th>Name</th><th>Region</th><th>Segment</th><th>TowerCo Revenue</th><th>Action</th></tr></thead>
                <tbody>
                  {results.target_accounts.filter(a => a.active).map(a => (
                    <tr key={a.id}>
                      <td style={{fontWeight:500,color:"#f1f5f9"}}>{a.name}</td>
                      <td>{a.region || "—"}</td>
                      <td><span className="badge badge-blue">{a.segment}</span></td>
                      <td style={{color:"#10b981"}}>{a.revenue_towerco > 0 ? "$" + a.revenue_towerco.toLocaleString() : "—"}</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => router.push("/annual")}>View Accounts</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
