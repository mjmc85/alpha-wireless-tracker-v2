import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../../components/Layout"
import { supabase } from "../../lib/supabase"

export default function PriorityDetail() {
  const router = useRouter()
  const { id } = router.query
  const [priority, setPriority] = useState(null)
  const [actions, setActions] = useState([])
  const [stakeholder, setStakeholder] = useState([])
  const [users, setUsers] = useState([])
  const [quarter, setQuarter] = useState(null)
  const [activeTab, setActiveTab] = useState("actions")
  const [showActionModal, setShowActionModal] = useState(false)
  const [showStakeholderModal, setShowStakeholderModal] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [editingStakeholder, setEditingStakeholder] = useState(null)
  const [actionForm, setActionForm] = useState({ description:"", owner_name:"", due_date:"", status:"Not Started", completion_pct:0, notes:"" })
  const [stakeholderForm, setStakeholderForm] = useState({ section:"Context", question:"", response:"" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    if (id) loadData()
  }, [id])

  async function loadData() {
    const [{ data: p }, { data: a }, { data: s }, { data: u }] = await Promise.all([
      supabase.from("priorities").select("*").eq("id", id).single(),
      supabase.from("action_items").select("*").eq("priority_id", id).order("item_number"),
      supabase.from("stakeholder_input").select("*").eq("priority_id", id).order("created_at"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setPriority(p)
    setActions(a || [])
    setStakeholder(s || [])
    setUsers(u || [])
    if (p?.quarter_id) {
      const { data: q } = await supabase.from("quarters").select("*").eq("id", p.quarter_id).single()
      setQuarter(q)
    }
  }

  const today = new Date(); today.setHours(0,0,0,0)
  function isOverdue(a) {
    if (!a.due_date || a.status === "Complete") return false
    const d = new Date(a.due_date); d.setHours(0,0,0,0)
    return d < today
  }

  function openAddAction() {
    setEditingAction(null)
    setActionForm({ description:"", owner_name:"", due_date:"", status:"Not Started", completion_pct:0, notes:"" })
    setShowActionModal(true)
  }
  function openEditAction(a) {
    setEditingAction(a)
    setActionForm({ description:a.description, owner_name:a.owner_name||"", due_date:a.due_date||"", status:a.status, completion_pct:a.completion_pct||0, notes:a.notes||"" })
    setShowActionModal(true)
  }
  async function saveAction() {
    if (!actionForm.description.trim()) return
    const data = { priority_id:id, description:actionForm.description, owner_name:actionForm.owner_name||null, due_date:actionForm.due_date||null, status:actionForm.status, completion_pct:parseInt(actionForm.completion_pct)||0, notes:actionForm.notes||null, week_updated:new Date().toISOString().split("T")[0], item_number: editingAction ? editingAction.item_number : (actions.length+1) }
    if (editingAction) {
      await supabase.from("action_items").update(data).eq("id", editingAction.id)
    } else {
      await supabase.from("action_items").insert([data])
    }
    setShowActionModal(false)
    loadData()
  }
  async function deleteAction(id) {
    if (!confirm("Delete this action?")) return
    await supabase.from("action_items").delete().eq("id", id)
    loadData()
  }

  function openAddStakeholder() {
    setEditingStakeholder(null)
    setStakeholderForm({ section:"Context", question:"", response:"" })
    setShowStakeholderModal(true)
  }
  function openEditStakeholder(s) {
    setEditingStakeholder(s)
    setStakeholderForm({ section:s.section||"Context", question:s.question||"", response:s.response||"" })
    setShowStakeholderModal(true)
  }
  async function saveStakeholder() {
    if (!stakeholderForm.question.trim()) return
    const data = { priority_id:id, section:stakeholderForm.section, question:stakeholderForm.question, response:stakeholderForm.response }
    if (editingStakeholder) {
      await supabase.from("stakeholder_input").update(data).eq("id", editingStakeholder.id)
    } else {
      await supabase.from("stakeholder_input").insert([data])
    }
    setShowStakeholderModal(false)
    loadData()
  }
  async function deleteStakeholder(id) {
    if (!confirm("Delete this entry?")) return
    await supabase.from("stakeholder_input").delete().eq("id", id)
    loadData()
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge "+(map[s]||"badge-gray")}>{s}</span>
  }

  if (!priority) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  const grouped = {}
  stakeholder.forEach(s => { if (!grouped[s.section]) grouped[s.section] = []; grouped[s.section].push(s) })

  return (
    <Layout>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" style={{marginBottom:12}} onClick={() => router.push("/dashboard")}>← Back to Dashboard</button>
          <div className="page-title">Priority {priority.priority_number}: {priority.title}</div>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            {statusBadge(priority.status)}
            {quarter && <span className="badge badge-blue">{quarter.title}</span>}
            <span className="badge badge-gray">{priority.overall_completion||0}% complete</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <div className={"tab"+(activeTab==="actions"?" active":"")} onClick={()=>setActiveTab("actions")}>
          Action Items <span className="badge badge-gray" style={{marginLeft:6}}>{actions.length}</span>
          {actions.filter(isOverdue).length > 0 && <span className="badge badge-red" style={{marginLeft:4}}>{actions.filter(isOverdue).length} overdue</span>}
        </div>
        <div className={"tab"+(activeTab==="stakeholder"?" active":"")} onClick={()=>setActiveTab("stakeholder")}>
          Stakeholder Input <span className="badge badge-gray" style={{marginLeft:6}}>{stakeholder.length}</span>
        </div>
      </div>

      {activeTab === "actions" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Action Items</div>
            <button className="btn btn-primary btn-sm" onClick={openAddAction}>+ Add Action</button>
          </div>
          {actions.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📝</div><div>No actions yet. Add your first one!</div></div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Description</th><th>Owner</th><th>Due Date</th><th>Status</th><th>Progress</th><th>Notes</th><th>Actions</th></tr></thead>
              <tbody>
                {actions.map(a => (
                  <tr key={a.id} className={isOverdue(a) ? "overdue-row" : ""}>
                    <td style={{color:"#4a90d9"}}>{a.item_number}</td>
                    <td style={{color: isOverdue(a) ? "#ef4444":"#f1f5f9", fontWeight:500}}>{a.description}</td>
                    <td>{a.owner_name || <span style={{color:"#4a6080"}}>—</span>}</td>
                    <td style={{color: isOverdue(a) ? "#ef4444":"#cbd5e1", fontWeight: isOverdue(a)?600:400}}>{a.due_date || "—"}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div className="progress-bar" style={{width:70}}><div className="progress-fill" style={{width:(a.completion_pct||0)+"%",background:a.completion_pct===100?"#10b981":"#4a90d9"}} /></div>
                        <span style={{fontSize:11,color:"#64748b"}}>{a.completion_pct||0}%</span>
                      </div>
                    </td>
                    <td style={{fontSize:12,color:"#64748b",maxWidth:200}}>{a.notes || "—"}</td>
                    <td>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditAction(a)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteAction(a.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "stakeholder" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Stakeholder Input</div>
            <button className="btn btn-primary btn-sm" onClick={openAddStakeholder}>+ Add Entry</button>
          </div>
          {stakeholder.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💬</div><div>No stakeholder input yet.</div></div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} style={{marginBottom:24}}>
                <div className="section-label">{section}</div>
                {items.map(s => (
                  <div key={s.id} style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:8,padding:16,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,color:"#f1f5f9",marginBottom:8}}>{s.question}</div>
                        {s.response && <div style={{fontSize:13,color:"#94a3b8"}}>{s.response}</div>}
                      </div>
                      <div style={{display:"flex",gap:4,marginLeft:12}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditStakeholder(s)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteStakeholder(s.id)}>Del</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {showActionModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowActionModal(false)}>
          <div className="modal">
            <div className="modal-title">{editingAction ? "Edit Action" : "Add Action"}</div>
            <div className="form-group"><label>Description *</label><textarea value={actionForm.description} onChange={e=>setActionForm({...actionForm,description:e.target.value})} placeholder="What needs to be done..." /></div>
            <div className="form-group"><label>Owner</label>
              <select value={actionForm.owner_name} onChange={e=>setActionForm({...actionForm,owner_name:e.target.value})}>
                <option value="">Select owner...</option>
                {users.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Due Date</label><input type="date" value={actionForm.due_date} onChange={e=>setActionForm({...actionForm,due_date:e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={actionForm.status} onChange={e=>setActionForm({...actionForm,status:e.target.value})}>
                {["Not Started","In Progress","Complete","Blocked","On Hold"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Completion %</label><input type="number" min="0" max="100" value={actionForm.completion_pct} onChange={e=>setActionForm({...actionForm,completion_pct:e.target.value})} /></div>
            <div className="form-group"><label>Notes</label><textarea value={actionForm.notes} onChange={e=>setActionForm({...actionForm,notes:e.target.value})} placeholder="Any notes..." /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowActionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAction}>{editingAction?"Save Changes":"Add Action"}</button>
            </div>
          </div>
        </div>
      )}

      {showStakeholderModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowStakeholderModal(false)}>
          <div className="modal">
            <div className="modal-title">{editingStakeholder ? "Edit Entry" : "Add Stakeholder Input"}</div>
            <div className="form-group"><label>Section</label>
              <select value={stakeholderForm.section} onChange={e=>setStakeholderForm({...stakeholderForm,section:e.target.value})}>
                {["Context","Success","Scope","Dependencies","Other"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Question *</label><input value={stakeholderForm.question} onChange={e=>setStakeholderForm({...stakeholderForm,question:e.target.value})} placeholder="Question or topic..." /></div>
            <div className="form-group"><label>Response</label><textarea value={stakeholderForm.response} onChange={e=>setStakeholderForm({...stakeholderForm,response:e.target.value})} placeholder="Response or notes..." /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowStakeholderModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStakeholder}>{editingStakeholder?"Save Changes":"Add Entry"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
