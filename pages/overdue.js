import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Overdue() {
  const router = useRouter()
  const [overdueItems, setOverdueItems] = useState([])
  const [priorities, setPriorities] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().split("T")[0]
    const [{ data: actions }, { data: p }, { data: u }] = await Promise.all([
      supabase.from("action_items").select("*").lt("due_date", today).neq("status", "Complete").order("due_date"),
      supabase.from("priorities").select("*"),
      supabase.from("users").select("*"),
    ])
    setOverdueItems(actions || [])
    setPriorities(p || [])
    setUsers(u || [])
    setLoading(false)
  }

  function getDaysOverdue(dueDate) {
    const today = new Date()
    const due = new Date(dueDate)
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24))
    return diff
  }

  function getPriority(priorityId) {
    return priorities.find(p => p.id === priorityId)
  }

  function getOwner(ownerId) {
    return users.find(u => u.id === ownerId)
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading overdue items...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">⚠️ Overdue Action Items</div>
          <div className="page-subtitle">{overdueItems.length} item{overdueItems.length !== 1 ? "s" : ""} past due date</div>
        </div>
      </div>

      {overdueItems.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div>No overdue items! Great job staying on track.</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Days Overdue</th>
                <th>Action Item</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueItems.map(item => {
                const priority = getPriority(item.priority_id)
                const owner = getOwner(item.owner_id)
                const daysOverdue = getDaysOverdue(item.due_date)
                return (
                  <tr key={item.id} style={{background: daysOverdue > 7 ? "rgba(239,68,68,0.1)" : "transparent"}}>
                    <td>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: daysOverdue > 7 ? "#ef4444" : daysOverdue > 3 ? "#f59e0b" : "#fbbf24",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 12
                      }}>
                        {daysOverdue}
                      </span>
                    </td>
                    <td style={{fontWeight:500,color:"#f1f5f9"}}>{item.description}</td>
                    <td>
                      {priority ? (
                        <span style={{color:"#4a90d9",cursor:"pointer"}} onClick={() => router.push("/priority/" + priority.id)}>
                          {priority.title}
                        </span>
                      ) : "—"}
                    </td>
                    <td>{owner ? owner.full_name : "—"}</td>
                    <td style={{color:"#ef4444",fontWeight:500}}>{item.due_date}</td>
                    <td>{statusBadge(item.status)}</td>
                    <td>{item.completion_percentage || 0}%</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => router.push("/priority/" + item.priority_id)}>
                        Update
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
