import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../../components/Layout"
import { supabase } from "../../lib/supabase"

export default function MeetingDetail() {
  const router = useRouter()
  const { id } = router.query
  const [meeting, setMeeting] = useState(null)
  const [actionItems, setActionItems] = useState([])
  const [priorities, setPriorities] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newAction, setNewAction] = useState({ description:"", owner_id:"", due_date:"" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const [{ data: m }, { data: a }, { data: p }, { data: u }] = await Promise.all([
      supabase.from("meetings").select("*").eq("id", id).single(),
      supabase.from("action_items").select("*").order("due_date"),
      supabase.from("priorities").select("*"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setMeeting(m)
    setActionItems(a || [])
    setPriorities(p || [])
    setUsers(u || [])
    setLoading(false)
  }

  async function saveField(field, value) {
    await supabase.from("meetings").update({ [field]: value }).eq("id", id)
    setMeeting({ ...meeting, [field]: value })
  }

  async function completeAction(actionId) {
    await supabase.from("action_items").update({ status:"Complete", completion_percentage:100 }).eq("id", actionId)
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message:"Action completed!" } }))
    loadData()
  }

  async function addAction() {
    if (!newAction.description.trim()) return
    const actionId = "action-" + Date.now()
    await supabase.from("action_items").insert([{
      id: actionId,
      description: newAction.description,
      owner_id: newAction.owner_id || null,
      due_date: newAction.due_date || null,
      status: "Not Started",
      completion_percentage: 0,
      priority_id: priorities[0]?.id || null,
      archived: false,
    }])
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message:"Action added!" } }))
    setNewAction({ description:"", owner_id:"", due_date:"" })
    loadData()
  }

  async function completeMeeting() {
    setSaving(true)
    await supabase.from("meetings").update({ status:"Completed" }).eq("id", id)
    setMeeting({ ...meeting, status:"Completed" })
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message:"Meeting marked complete!" } }))
    setSaving(false)
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  const today = new Date().toISOString().split("T")[0]
  const pastDueActions = actionItems.filter(a => a.due_date && a.due_date < today && a.status !== "Complete" && !a.archived)
  const upcomingActions = actionItems.filter(a => a.status !== "Complete" && !a.archived && (!a.due_date || a.due_date >= today))

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading meeting...</div></Layout>
  if (!meeting) return <Layout><div style={{color:"#64748b",padding:40}}>Meeting not found</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="breadcrumb" style={{cursor:"pointer",color:"#4a90d9"}} onClick={() => router.push("/meetings")}>← Back to Meetings</div>
          <div className="page-title">📅 {meeting.title}</div>
          <div className="page-subtitle">{meeting.meeting_date} {meeting.meeting_time ? `at ${meeting.meeting_time}` : ""}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {meeting.teams_link && (
            <a href={meeting.teams_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">🔗 Join Teams</a>
          )}
          {meeting.status !== "Completed" && (
            <button className="btn btn-secondary" onClick={completeMeeting} disabled={saving}>✅ Complete Meeting</button>
          )}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:"#10b981",marginBottom:12}}>🎉 Good News</div>
          <textarea
            value={meeting.good_news || ""}
            onChange={e => setMeeting({ ...meeting, good_news: e.target.value })}
            onBlur={e => saveField("good_news", e.target.value)}
            placeholder="Capture wins and good news from the team..."
            style={{width:"100%",minHeight:120,padding:12,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14,resize:"vertical"}}
          />
        </div>

        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:"#3b82f6",marginBottom:12}}>📊 Metrics Review</div>
          <textarea
            value={meeting.metrics_review || ""}
            onChange={e => setMeeting({ ...meeting, metrics_review: e.target.value })}
            onBlur={e => saveField("metrics_review", e.target.value)}
            placeholder="Review KPIs and metrics..."
            style={{width:"100%",minHeight:120,padding:12,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14,resize:"vertical"}}
          />
        </div>

        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:"#f59e0b",marginBottom:12}}>⭐ #1 Thing Today</div>
          <textarea
            value={meeting.one_thing || ""}
            onChange={e => setMeeting({ ...meeting, one_thing: e.target.value })}
            onBlur={e => saveField("one_thing", e.target.value)}
            placeholder="Each person's top priority for today..."
            style={{width:"100%",minHeight:120,padding:12,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14,resize:"vertical"}}
          />
        </div>

        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:"#ef4444",marginBottom:12}}>🚫 Stucks</div>
          <textarea
            value={meeting.stucks || ""}
            onChange={e => setMeeting({ ...meeting, stucks: e.target.value })}
            onBlur={e => saveField("stucks", e.target.value)}
            placeholder="Blockers that need resolving..."
            style={{width:"100%",minHeight:120,padding:12,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14,resize:"vertical"}}
          />
        </div>
      </div>

      <div className="card" style={{marginBottom:24}}>
        <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:16}}>✅ Action Items</div>

        <div style={{display:"flex",gap:8,marginBottom:16,paddingBottom:16,borderBottom:"1px solid #334155"}}>
          <input
            value={newAction.description}
            onChange={e => setNewAction({ ...newAction, description: e.target.value })}
            placeholder="Add action item..."
            style={{flex:1,padding:"10px 12px",borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14}}
            onKeyDown={e => e.key === "Enter" && addAction()}
          />
          <select
            value={newAction.owner_id}
            onChange={e => setNewAction({ ...newAction, owner_id: e.target.value })}
            style={{padding:"10px 12px",borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14}}
          >
            <option value="">Owner</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <input
            type="date"
            value={newAction.due_date}
            onChange={e => setNewAction({ ...newAction, due_date: e.target.value })}
            style={{padding:"10px 12px",borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14}}
          />
          <button className="btn btn-primary" onClick={addAction}>+ Add</button>
        </div>

        {pastDueActions.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fca5a5",marginBottom:8}}>⚠️ PAST DUE</div>
            {pastDueActions.map(a => {
              const owner = users.find(u => u.id === a.owner_id)
              const priority = priorities.find(p => p.id === a.priority_id)
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"rgba(239,68,68,0.1)",borderRadius:8,marginBottom:4,border:"1px solid rgba(239,68,68,0.3)"}}>
                  <input type="checkbox" onChange={() => completeAction(a.id)} style={{cursor:"pointer"}} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#f1f5f9"}}>{a.description}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{owner?.full_name} · {priority?.title} · due {a.due_date}</div>
                  </div>
                  <span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>OVERDUE</span>
                </div>
              )
            })}
          </div>
        )}

        <div>
          <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8}}>📋 UPCOMING</div>
          {upcomingActions.length === 0 ? (
            <div style={{color:"#64748b",fontSize:13,padding:8}}>No upcoming action items</div>
          ) : (
            upcomingActions.map(a => {
              const owner = users.find(u => u.id === a.owner_id)
              const priority = priorities.find(p => p.id === a.priority_id)
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"#0f172a",borderRadius:8,marginBottom:4,border:"1px solid #334155"}}>
                  <input type="checkbox" onChange={() => completeAction(a.id)} style={{cursor:"pointer"}} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#f1f5f9"}}>{a.description}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{owner?.full_name || "Unassigned"} · {priority?.title || "No priority"} {a.due_date ? `· due ${a.due_date}` : ""}</div>
                  </div>
                  {statusBadge(a.status)}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:12}}>📝 Meeting Notes</div>
        <textarea
          value={meeting.notes || ""}
          onChange={e => setMeeting({ ...meeting, notes: e.target.value })}
          onBlur={e => saveField("notes", e.target.value)}
          placeholder="General meeting notes..."
          style={{width:"100%",minHeight:120,padding:12,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:14,resize:"vertical"}}
        />
      </div>
    </Layout>
  )
}
