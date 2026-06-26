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
  const [filterQuarter, setFilterQuarter] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [chartsLoaded, setChartsLoaded] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  useEffect(() => {
    if (!loading && priorities.length > 0 && typeof window !== "undefined") {
      loadCharts()
    }
  }, [loading, priorities])

  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: a }, { data: q }, { data: u }] = await Promise.all([
      supabase.from("priorities").select("*").order("priority_number"),
      supabase.from("action_items").select("*").order("due_date"),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setPriorities(p || [])
    setActionItems(a || [])
    setQuarters(q || [])
    setUsers(u || [])
    setLoading(false)
  }

  async function loadCharts() {
    if (typeof window === "undefined") return
    
    const Chart = (await import("chart.js/auto")).default

    // Destroy existing charts
    const chartIds = ["priorityStatusChart", "actionStatusChart", "quarterChart", "revenueRegionChart"]
    chartIds.forEach(id => {
      const existing = Chart.getChart(id)
      if (existing) existing.destroy()
    })

    // 1. Priority Status Doughnut Chart
    const priorityStatusCounts = { "Not Started": 0, "In Progress": 0, "Complete": 0, "Blocked": 0, "On Hold": 0 }
    priorities.forEach(p => { if (priorityStatusCounts[p.status] !== undefined) priorityStatusCounts[p.status]++ })
    
    new Chart(document.getElementById("priorityStatusChart"), {
      type: "doughnut",
      data: {
        labels: Object.keys(priorityStatusCounts),
        datasets: [{ data: Object.values(priorityStatusCounts), backgroundColor: ["#6b7280", "#3b82f6", "#10b981", "#ef4444", "#f59e0b"], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom", labels: { color: "#94a3b8" } }, title: { display: true, text: "Priority Status", color: "#f1f5f9" } } }
    })

    // 2. Action Items Status Doughnut Chart
    const actionStatusCounts = { "Not Started": 0, "In Progress": 0, "Complete": 0, "Blocked": 0, "On Hold": 0 }
    actionItems.forEach(a => { if (actionStatusCounts[a.status] !== undefined) actionStatusCounts[a.status]++ })
    
    new Chart(document.getElementById("actionStatusChart"), {
      type: "doughnut",
      data: {
        labels: Object.keys(actionStatusCounts),
        datasets: [{ data: Object.values(actionStatusCounts), backgroundColor: ["#6b7280", "#3b82f6", "#10b981", "#ef4444", "#f59e0b"], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom", labels: { color: "#94a3b8" } }, title: { display: true, text: "Action Items Status", color: "#f1f5f9" } } }
    })

    // 3. Priorities per Quarter Bar Chart
    const quarterCounts = {}
    quarters.forEach(q => { quarterCounts[q.title] = 0 })
    priorities.forEach(p => {
      const q = quarters.find(q => q.id === p.quarter_id)
      if (q && quarterCounts[q.title] !== undefined) quarterCounts[q.title]++
    })

    new Chart(document.getElementById("quarterChart"), {
      type: "bar",
      data: {
        labels: Object.keys(quarterCounts),
        datasets: [{ label: "Priorities", data: Object.values(quarterCounts), backgroundColor: "#3b82f6", borderRadius: 6 }]
      },
      options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: "Priorities by Quarter", color: "#f1f5f9" } }, scales: { y: { beginAtZero: true, ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }, x: { ticks: { color: "#94a3b8" }, grid: { display: false } } } }
    })

    // 4. Revenue by Region Bar Chart (from target_accounts)
    const { data: accounts } = await supabase.from("target_accounts").select("region, revenue_towerco").eq("active", true)
    const revenueByRegion = {}
    if (accounts) {
      accounts.forEach(a => {
        if (!revenueByRegion[a.region]) revenueByRegion[a.region] = 0
        revenueByRegion[a.region] += a.revenue_towerco || 0
      })
    }

    new Chart(document.getElementById("revenueRegionChart"), {
      type: "bar",
      data: {
        labels: Object.keys(revenueByRegion),
        datasets: [{ label: "TowerCo Revenue ($)", data: Object.values(revenueByRegion).map(v => v / 1000), backgroundColor: "#10b981", borderRadius: 6 }]
      },
      options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: "TowerCo Revenue by Region ($K)", color: "#f1f5f9" } }, scales: { y: { beginAtZero: true, ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }, x: { ticks: { color: "#94a3b8" }, grid: { display: false } } } }
    })

    setChartsLoaded(true)
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  const today = new Date().toISOString().split("T")[0]
  const pastDue = actionItems.filter(a => a.due_date && a.due_date < today && a.status !== "Complete").length
  const dueToday = actionItems.filter(a => a.due_date === today && a.status !== "Complete").length

  const filteredActions = filterQuarter || filterUser
    ? actionItems.filter(a => (!filterQuarter || (priorities.find(p => p.id === a.priority_id)?.quarter_id === filterQuarter)) && (!filterUser || a.owner_id === filterUser))
    : actionItems

  const pastDueActions = filteredActions.filter(a => a.due_date && a.due_date < today && a.status !== "Complete")
  const todayActions = filteredActions.filter(a => a.due_date === today && a.status !== "Complete")
  const upcomingActions = filteredActions.filter(a => a.due_date && a.due_date > today && a.due_date <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] && a.status !== "Complete")

  const filteredPriorities = (!filterQuarter || filterQuarter === "all") 
    ? priorities 
    : priorities.filter(p => p.quarter_id === filterQuarter)

  const totalPriorities = filteredPriorities.length
  const avgCompletion = totalPriorities > 0 ? Math.round(filteredPriorities.reduce((s,p) => s + (p.overall_completion||0), 0) / totalPriorities) : 0
  const totalActions = actionItems.length

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading Dashboard...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">📊 Dashboard</div><div className="page-subtitle">Track your priorities and action items</div></div>
      </div>

      <div className="filters" style={{marginBottom:24,display:"flex",gap:12}}>
        <button className={activeTab === "overview" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={activeTab === "charts" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => { setActiveTab("charts"); setTimeout(loadCharts, 100) }}>📈 Charts</button>
        <button className={activeTab === "actions" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("actions")}>Action Items</button>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="stat-cards">
            <div className="stat-card"><div className="stat-label">Total Priorities</div><div className="stat-value">{totalPriorities}</div></div>
            <div className="stat-card"><div className="stat-label">Avg Progress</div><div className="stat-value">{avgCompletion}%</div></div>
            <div className="stat-card"><div className="stat-label">Total Actions</div><div className="stat-value">{totalActions}</div></div>
            <div className="stat-card" style={{border:"1px solid #ef4444"}}><div className="stat-label" style={{color:"#fca5a5"}}>Past Due</div><div className="stat-value" style={{color:"#ef4444"}}>{pastDue}</div></div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><div className="card-title">Priorities</div></div>
            {filteredPriorities.length === 0 ? <div style={{color:"#64748b",padding:12}}>No priorities found</div> : (
              <table><thead><tr><th>#</th><th>Priority</th><th>Quarter</th><th>Status</th><th>Progress</th><th></th></tr></thead>
                <tbody>
                  {filteredPriorities.slice(0,10).map(p => {
                    const q = quarters.find(q => q.id === p.quarter_id)
                    return (
                      <tr key={p.id}>
                        <td style={{color:"#4a90d9",fontWeight:600}}>{p.priority_number}</td>
                        <td style={{fontWeight:500,color:"#f1f5f9",cursor:"pointer"}} onClick={() => router.push("/priority/" + p.id)}>{p.title}</td>
                        <td>{q ? <span className="badge badge-blue">{q.title}</span> : "—"}</td>
                        <td>{statusBadge(p.status)}</td>
                        <td><div style={{display:"flex",alignItems:"center",gap:8}}><div className="progress-bar" style={{width:80}}><div className="progress-fill" style={{width:(p.overall_completion||0)+"%"}} /></div><span style={{fontSize:12,color:"#64748b"}}>{p.overall_completion||0}%</span></div></td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => router.push("/priority/" + p.id)}>View</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === "charts" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:24}}>
          <div className="card"><canvas id="priorityStatusChart"></canvas></div>
          <div className="card"><canvas id="actionStatusChart"></canvas></div>
          <div className="card"><canvas id="quarterChart"></canvas></div>
          <div className="card"><canvas id="revenueRegionChart"></canvas></div>
        </div>
      )}

      {activeTab === "actions" && (
        <div>
          <div className="filters" style={{marginBottom:16}}>
            <select value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}>
              <option value="">All Quarters</option>
              {quarters.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">All Owners</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>

          {pastDueActions.length > 0 && (
            <div className="card" style={{marginBottom:16,borderLeft:"4px solid #ef4444"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#fca5a5",marginBottom:12}}>⚠️ Past Due ({pastDueActions.length})</div>
              {pastDueActions.map(a => {
                const p = priorities.find(p => p.id === a.priority_id)
                return <div key={a.id} style={{padding:"8px 0",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><span style={{color:"#f1f5f9"}}>{a.description}</span><span style={{fontSize:12,color:"#64748b",marginLeft:8}}>due {a.due_date}</span></div>
                  <button className="btn btn-secondary btn-sm" onClick={() => p && router.push("/priority/" + p.id)}>View</button>
                </div>
              })}
            </div>
          )}

          {todayActions.length > 0 && (
            <div className="card" style={{marginBottom:16,borderLeft:"4px solid #f59e0b"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#fcd34d",marginBottom:12}}>📅 Due Today ({todayActions.length})</div>
              {todayActions.map(a => {
                const p = priorities.find(p => p.id === a.priority_id)
                return <div key={a.id} style={{padding:"8px 0",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><span style={{color:"#f1f5f9"}}>{a.description}</span></div>
                  <button className="btn btn-secondary btn-sm" onClick={() => p && router.push("/priority/" + p.id)}>View</button>
                </div>
              })}
            </div>
          )}

          <div className="card">
            <div style={{fontSize:14,fontWeight:600,color:"#64748b",marginBottom:12}}>All Action Items</div>
            {filteredActions.length === 0 ? <div style={{color:"#64748b"}}>No action items</div> : (
              <table>
                <thead><tr><th>Action Item</th><th>Priority</th><th>Owner</th><th>Due Date</th><th>Status</th><th>Progress</th></tr></thead>
                <tbody>
                  {filteredActions.map(a => {
                    const p = priorities.find(p => p.id === a.priority_id)
                    const u = users.find(u => u.id === a.owner_id)
                    return (
                      <tr key={a.id}>
                        <td style={{fontWeight:500,color:"#f1f5f9"}}>{a.description}</td>
                        <td>{p ? <span style={{color:"#4a90d9",cursor:"pointer"}} onClick={() => router.push("/priority/" + p.id)}>{p.title}</span> : "—"}</td>
                        <td>{u ? u.full_name : "—"}</td>
                        <td style={{color:a.due_date && a.due_date < today && a.status !== "Complete" ? "#ef4444" : "#f1f5f9"}}>{a.due_date || "—"}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>{a.completion_percentage || 0}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
