import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function EmbeddableDashboard() {
  const router = useRouter()
  const [priorities, setPriorities] = useState([])
  const [actionItems, setActionItems] = useState([])
  const [quarters, setQuarters] = useState([])
  const [users, setUsers] = useState([])
  const [filterQuarter, setFilterQuarter] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [activeTab, setActiveTab] = useState("priorities")
  const [loading, setLoading] = useState(true)

  const isEmbed = typeof window !== "undefined" && window.location.search.includes("embed=true")

  useEffect(() => {
    if (!localStorage.getItem("aw_auth") && !isEmbed) { router.push("/"); return }
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
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
    setActionItems(a || [])
    setQuarters(q || [])
    setUsers(u || [])
    setLoading(false)
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  const filteredActions = actionItems
  const filteredPriorities = priorities

  const totalPriorities = filteredPriorities.length
  const avgCompletion = totalPriorities > 0 ? Math.round(filteredPriorities.reduce((s,p) => s + (p.overall_completion||0), 0) / totalPriorities) : 0

  if (loading) return <div style={{padding:40,color:"#64748b",background:"#0f172a",minHeight:"100vh"}}>Loading Dashboard...</div>

  return (
    <div style={{padding: isEmbed ? 12 : 24, background:"#0f172a", minHeight:"100vh", color: "#f1f5f9", fontFamily: "sans-serif"}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom: 20}}>
        <h1 style={{margin:0, fontSize: 20}}>📊 Alpha Wireless Summary</h1>
        {isEmbed && <button onClick={loadData} style={{background:"#1e40af", color:"#fff", border:"none", padding:"4px 8px", borderRadius:4, cursor:"pointer"}}>Refresh</button>}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 10, marginBottom: 20}}>
        <div style={{background:"#1e293b", padding: 15, borderRadius: 8, textAlign:"center"}}>
          <div style={{fontSize: 12, color: "#64748b"}}>PRIORITIES</div>
          <div style={{fontSize: 24, fontWeight: "bold"}}>{totalPriorities}</div>
        </div>
        <div style={{background:"#1e293b", padding: 15, borderRadius: 8, textAlign:"center"}}>
          <div style={{fontSize: 12, color: "#64748b"}}>AVG PROGRESS</div>
          <div style={{fontSize: 24, fontWeight: "bold"}}>{avgCompletion}%</div>
        </div>
        <div style={{background:"#1e293b", padding: 15, borderRadius: 8, textAlign:"center"}}>
          <div style={{fontSize: 12, color: "#64748b"}}>ACTIONS</div>
          <div style={{fontSize: 24, fontWeight: "bold"}}>{actionItems.length}</div>
        </div>
      </div>

      <div style={{background:"#1e293b", borderRadius: 8, overflow:"hidden"}}>
        <table style={{width:"100%", borderCollapse:"collapse", fontSize: 13}}>
          <thead style={{background: "#0f172a"}}>
            <tr>
              <th style={{padding: 10, textAlign:"left"}}>Priority</th>
              <th style={{padding: 10, textAlign:"left"}}>Progress</th>
              <th style={{padding: 10, textAlign:"left"}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {priorities.map(p => (
              <tr key={p.id} style={{borderTop: "1px solid #334155"}}>
                <td style={{padding: 10}}>{p.title}</td>
                <td style={{padding: 10}}>{p.overall_completion}%</td>
                <td style={{padding: 10}}>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
