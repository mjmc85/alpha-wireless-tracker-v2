import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Dashboard() {
  const router = useRouter()
  const [priorities, setPriorities] = useState([])
  const [actions, setActions] = useState([])
  const [quarters, setQuarters] = useState([])
  const [users, setUsers] = useState([])
  const [filterQuarter, setFilterQuarter] = useState("all")
  const [filterUser, setFilterUser] = useState("all")
  const [activeTab, setActiveTab] = useState("priorities")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: a }, { data: q }, { data: u }] = await Promise.all([
      supabase.from("priorities").select("*").order("priority_number"),
      supabase.from("action_items").select("*").order("due_date"),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setPriorities(p || [])
    setActions(a || [])
    setQuarters(q || [])
    setUsers(u || [])
    setLoading(false)
  }

  const today = new Date(); today.setHours(0,0,0,0)
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)

  const filteredActions = actions.filter(a => {
    if (filterUser !== "all" && a.owner_name !== filterUser) return false
    if (filterQuarter !== "all") {
      const p = priorities.find(p => p.id === a.priority_id)
      if (!p || p.quarter_id !== filterQuarter) return false
    }
    return a.status !== "Complete"
  })

  function bucket(a) {
    if (!a.due_date) return "later"
    const d = new Date(a.due_date); d.setHours(0,0,0,0)
    if (d < today) return "overdue"
    if (d.toDateString() === today.toDateString()) return "today"
    if (d <= nextWeek) return "nextweek"
    return "later"
  }

  const overdue = filteredActions.filter(a => bucket(a) === "overdue")
  const todayItems = filteredActions.filter(a => bucket(a) === "today")
  const nextWeekItems = filteredActions.filter(a => bucket(a) === "nextweek")
  const laterItems = filteredActions.filter(a => bucket(a) === "later")

  const filteredPriorities = priorities.filter(p => filterQuarter === "all" || p.quarter_id === filterQuarter)

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  function ActionRow({ a }) {
    const isOverdue = bucket(a) === "overdue"
    const priority = priorities.find(p => p.id === a.priority_id)
    return (
      <tr className={isOverdue ? "overdue-row" : ""} style={{ cursor:"pointer" }} onClick={() => router.push("/priority/" + a.priority_id)}>
        <td><span style={{ color: isOverdue ? "#ef4444" : "#cbd5e1" }}>{a.description}</span></td>
        <td>{a.owner_name || <span style={{color:"#4a6080"}}>Unassigned</span>}</td>
        <td><span style={{ color: isOverdue ? "#ef4444" : "#cbd5e1", fontWeight: isOverdue ? 600 : 400 }}>{a.due_date || "—"}</span></td>
        <td>{statusBadge(a.status)}</td>
        <td>
          <div className="progress-bar" style={{width:80}}>
            <div className="progress-fill" style={{width: a.completion_pct + "%", background: a.completion_pct === 100 ? "#10b981" : "#4a90d9"}} />
          </div>
          <span style={{fontSize:11,color:"#64748b",marginLeft:6}}>{a.completion_pct}%</span>
        </td>
        <td style={{fontSize:11,color:"#64748b"}}>{priority ? priority.title : "—"}</td>
      </tr>
    )
  }

  function ActionSection({ title, items, color }) {
    if (items.length === 0) return null
    return (
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:12,fontWeight:700,color,textTransform:"uppercase",letterSpacing:1}}>{title}</span>
          <span className="badge" style={{background:"rgba(255,255,255,0.05)",color:"#94a3b8"}}>{items.length}</span>
        </div>
        <table><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th>Progress</th><th>Priority</th></tr></thead>
          <tbody>{items.map(a => <ActionRow key={a.id} a={a} />)}</tbody>
        </table>
      </div>
    )
  }

  const totalComplete = priorities.filter(p => p.status === "Complete").length
  const totalBlocked = actions.filter(a => a.status === "Blocked").length
  const avgCompletion = priorities.length ? Math.round(priorities.reduce((s,p) => s + (p.overall_completion||0), 0) / priorities.length) : 0

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Alpha Wireless Priority Tracker</div>
        </div>
        <button className="btn btn-primary" onClick={() => router.push("/priorities")}>+ Add Priority</button>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="stat-label">Total Priorities</div><div className="stat-value">{priorities.length}</div><div className="stat-sub">{totalComplete} complete</div></div>
        <div className="stat-card"><div className="stat-label">Total Actions</div><div className="stat-value">{actions.length}</div><div className="stat-sub">{actions.filter(a=>a.status==="Complete").length} complete</div></div>
        <div className="stat-card"><div className="stat-label">Avg Completion</div><div className="stat-value">{avgCompletion}%</div><div className="stat-sub">across all priorities</div></div>
        <div className="stat-card"><div className="stat-label">Overdue Actions</div><div className="stat-value" style={{color: overdue.length > 0 ? "#ef4444":"#10b981"}}>{overdue.length}</div><div className="stat-sub">{totalBlocked} blocked</div></div>
      </div>

      <div className="filters">
        <select value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}>
          <option value="all">All Quarters</option>
          {quarters.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="all">All Team Members</option>
          {users.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
        </select>
      </div>

      <div className="tabs">
        <div className={"tab"+(activeTab==="priorities"?" active":"")} onClick={()=>setActiveTab("priorities")}>Priorities</div>
        <div className={"tab"+(activeTab==="actions"?" active":"")} onClick={()=>setActiveTab("actions")}>
          Action Items {overdue.length > 0 && <span className="badge badge-red" style={{marginLeft:6}}>{overdue.length} overdue</span>}
        </div>
      </div>

      {activeTab === "priorities" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Priorities ({filteredPriorities.length})</div>
          </div>
          {filteredPriorities.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><div>No priorities yet</div></div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Priority</th><th>Owner</th><th>Quarter</th><th>Status</th><th>Progress</th><th></th></tr></thead>
              <tbody>
                {filteredPriorities.map(p => {
                  const q = quarters.find(q => q.id === p.quarter_id)
                  const u = users.find(u => u.id === p.owner_id)
                  return (
                    <tr key={p.id} style={{cursor:"pointer"}} onClick={() => router.push("/priority/"+p.id)}>
                      <td style={{color:"#4a90d9",fontWeight:600}}>{p.priority_number}</td>
                      <td style={{fontWeight:500,color:"#f1f5f9"}}>{p.title}</td>
                      <td>{u ? u.full_name : <span style={{color:"#4a6080"}}>—</span>}</td>
                      <td>{q ? <span className="badge badge-blue">{q.title}</span> : "—"}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div className="progress-bar" style={{width:100}}><div className="progress-fill" style={{width:(p.overall_completion||0)+"%"}} /></div>
                          <span style={{fontSize:12,color:"#64748b",minWidth:32}}>{p.overall_completion||0}%</span>
                        </div>
                      </td>
                      <td><span className="btn btn-secondary btn-sm">View →</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">All Action Items</div>
            <span style={{fontSize:12,color:"#64748b"}}>{filteredActions.length} open actions</span>
          </div>
          {filteredActions.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✅</div><div>All caught up!</div></div>
          ) : (
            <>
              <ActionSection title="⚠ Past Due" items={overdue} color="#ef4444" />
              <ActionSection title="📌 Today" items={todayItems} color="#f59e0b" />
              <ActionSection title="📅 Next 7 Days" items={nextWeekItems} color="#4a90d9" />
              <ActionSection title="🗓 Later" items={laterItems} color="#64748b" />
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
