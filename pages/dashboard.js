import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Dashboard() {
  const router = useRouter()
  const [priorities, setPriorities] = useState([])
  const [actionItems, setActionItems] = useState([])
  const [quarters, setQuarters] = useState([])
  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: a }, { data: q }, { data: u }, { data: acc }] = await Promise.all([
      supabase.from("priorities").select("*").order("priority_number"),
      supabase.from("action_items").select("*").order("due_date"),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
      supabase.from("users").select("*").order("full_name"),
      supabase.from("target_accounts").select("*").eq("active", true),
    ])
    setPriorities(p || [])
    setActionItems(a || [])
    setQuarters(q || [])
    setUsers(u || [])
    setAccounts(acc || [])
    setLoading(false)
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  const today = new Date().toISOString().split("T")[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  // Stats
  const totalPriorities = priorities.length
  const avgCompletion = totalPriorities > 0 ? Math.round(priorities.reduce((s,p) => s + (p.overall_completion||0), 0) / totalPriorities) : 0
  const totalActions = actionItems.length
  const pastDue = actionItems.filter(a => a.due_date && a.due_date < today && a.status !== "Complete").length
  const dueThisWeek = actionItems.filter(a => a.due_date && a.due_date >= today && a.due_date <= nextWeek && a.status !== "Complete").length
  const completedThisWeek = actionItems.filter(a => a.status === "Complete").length

  // Status breakdown
  const statusCounts = { "Not Started": 0, "In Progress": 0, "Complete": 0, "Blocked": 0, "On Hold": 0 }
  priorities.forEach(p => { if (statusCounts[p.status] !== undefined) statusCounts[p.status]++ })
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  // Revenue by region
  const revenueByRegion = {}
  accounts.forEach(a => {
    if (a.region) {
      if (!revenueByRegion[a.region]) revenueByRegion[a.region] = 0
      revenueByRegion[a.region] += a.revenue_towerco || 0
    }
  })
  const maxRevenue = Math.max(...Object.values(revenueByRegion), 1)

  // Top priorities by progress
  const topPriorities = [...priorities].sort((a, b) => (b.overall_completion || 0) - (a.overall_completion || 0)).slice(0, 5)

  // Recent action items
  const recentActions = actionItems.filter(a => a.status !== "Complete").slice(0, 5)

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading Dashboard...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">📊 Dashboard</div><div className="page-subtitle">Track your priorities and action items</div></div>
      </div>

      {/* Stats Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Total Priorities</div>
          <div className="stat-value">{totalPriorities}</div>
          <div className="stat-sub">{statusCounts["Complete"]} complete</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Progress</div>
          <div className="stat-value">{avgCompletion}%</div>
          <div className="stat-sub">across all priorities</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Due This Week</div>
          <div className="stat-value" style={{color: dueThisWeek > 0 ? "#f59e0b" : "#10b981"}}>{dueThisWeek}</div>
          <div className="stat-sub">{pastDue} overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Actions</div>
          <div className="stat-value">{totalActions}</div>
          <div className="stat-sub">{completedThisWeek} complete</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
        {/* Priority Status Breakdown */}
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:16}}>📋 Priority Status</div>
          <div style={{display:"flex",height:24,borderRadius:12,overflow:"hidden",background:"#1e293b"}}>
            {statusTotal > 0 && Object.entries(statusCounts).map(([status, count]) => {
              if (count === 0) return null
              const percent = (count / statusTotal) * 100
              const colors = { "Not Started": "#6b7280", "In Progress": "#3b82f6", "Complete": "#10b981", "Blocked": "#ef4444", "On Hold": "#f59e0b" }
              return <div key={status} style={{width:percent+"%",background:colors[status],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#fff"}}>{count}</div>
            })}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:12}}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const colors = { "Not Started": "#6b7280", "In Progress": "#3b82f6", "Complete": "#10b981", "Blocked": "#ef4444", "On Hold": "#f59e0b" }
              return (
                <div key={status} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                  <div style={{width:10,height:10,borderRadius:2,background:colors[status]}}></div>
                  <span style={{color:"#94a3b8"}}>{status}</span>
                  <span style={{color:"#f1f5f9",fontWeight:600}}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue by Region */}
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:16}}>💰 TowerCo Revenue by Region</div>
          {Object.keys(revenueByRegion).length === 0 ? (
            <div style={{color:"#64748b",fontSize:13}}>No revenue data yet</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(revenueByRegion).map(([region, revenue]) => {
                const percent = (revenue / maxRevenue) * 100
                const fmt = n => n >= 1000000 ? "$"+(n/1000000).toFixed(1)+"M" : "$"+(n/1000).toFixed(0)+"K"
                return (
                  <div key={region} style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:100,fontSize:12,color:"#94a3b8",textAlign:"right"}}>{region}</div>
                    <div style={{flex:1,height:20,background:"#1e293b",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:percent+"%",background:"linear-gradient(90deg, #10b981, #34d399)",borderRadius:4,transition:"width 0.5s ease"}}></div>
                    </div>
                    <div style={{width:70,fontSize:12,fontWeight:600,color:"#10b981",textAlign:"right"}}>{fmt(revenue)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progress & Actions Row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
        {/* Top Priorities by Progress */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9"}}>🏆 Top Priorities</div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push("/priorities")}>View All</button>
          </div>
          {topPriorities.length === 0 ? (
            <div style={{color:"#64748b",fontSize:13}}>No priorities yet</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {topPriorities.map((p, i) => (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={() => router.push("/priority/"+p.id)}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:i===0?"linear-gradient(135deg, #f59e0b, #d97706)":i===1?"linear-gradient(135deg, #94a3b8, #64748b)":i===2?"linear-gradient(135deg, #b45309, #92400e)":"#334155",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#f1f5f9",marginBottom:4}}>{p.title}</div>
                    <div className="progress-bar" style={{width:"100%"}}><div className="progress-fill" style={{width:(p.overall_completion||0)+"%"}}></div></div>
                  </div>
                  <div style={{width:40,fontSize:12,fontWeight:600,color:p.overall_completion===100?"#10b981":"#f1f5f9",textAlign:"right"}}>{p.overall_completion||0}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Actions */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9"}}>⚡ Upcoming Actions</div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push("/calendar")}>View Calendar</button>
          </div>
          {recentActions.length === 0 ? (
            <div style={{color:"#64748b",fontSize:13}}>No pending actions</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {recentActions.map(a => {
                const p = priorities.find(pr => pr.id === a.priority_id)
                const isOverdue = a.due_date && a.due_date < today
                return (
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:isOverdue?"rgba(239,68,68,0.1)":"#0f172a",borderRadius:8,border:isOverdue?"1px solid rgba(239,68,68,0.3)":"1px solid #334155"}}>
                    <div style={{flex:1,overflow:"hidden"}}>
                      <div style={{fontSize:13,fontWeight:500,color:"#f1f5f9",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.description}</div>
                      {p && <div style={{fontSize:11,color:"#64748b"}}>{p.title}</div>}
                    </div>
                    <div style={{fontSize:11,color:isOverdue?"#ef4444":"#64748b",whiteSpace:"nowrap"}}>{isOverdue?"⚠️ Overdue":a.due_date||"No date"}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* All Priorities Table */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:600,color:"#f1f5f9"}}>📋 All Priorities</div>
          <button className="btn btn-primary btn-sm" onClick={() => router.push("/priorities")}>+ Add Priority</button>
        </div>
        {priorities.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><div>No priorities yet. Add your first one!</div></div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Priority</th><th>Quarter</th><th>Status</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {priorities.slice(0,10).map(p => {
                const q = quarters.find(q => q.id === p.quarter_id)
                return (
                  <tr key={p.id}>
                    <td style={{color:"#4a90d9",fontWeight:600}}>{p.priority_number}</td>
                    <td style={{fontWeight:500,color:"#f1f5f9",cursor:"pointer"}} onClick={() => router.push("/priority/"+p.id)}>{p.title}</td>
                    <td>{q ? <span className="badge badge-blue">{q.title}</span> : "—"}</td>
                    <td>{statusBadge(p.status)}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div className="progress-bar" style={{width:80}}><div className="progress-fill" style={{width:(p.overall_completion||0)+"%"}}></div></div>
                        <span style={{fontSize:12,color:"#64748b"}}>{p.overall_completion||0}%</span>
                      </div>
                    </td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => router.push("/priority/"+p.id)}>View</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
