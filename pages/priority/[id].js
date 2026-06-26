import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../../components/Layout"
import { supabase } from "../../lib/supabase"

export default function PriorityDetail() {
  const router = useRouter()
  const { id } = router.query
  const [priority, setPriority] = useState(null)
  const [actionItems, setActionItems] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ description:"", owner_id:"", status:"Not Started", due_date:"", completion_percentage:0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")
  const [dragId, setDragId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: a }, { data: u }] = await Promise.all([
      supabase.from("priorities").select("*").eq("id", id).single(),
      supabase.from("action_items").select("*").eq("priority_id", id).order("created_at"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setPriority(p)
    setActionItems(a || [])
    setUsers(u || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ description:"", owner_id:"", status:"Not Started", due_date:"", completion_percentage:0 })
    setShowModal(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ description:item.description, owner_id:item.owner_id||"", status:item.status, due_date:item.due_date||"", completion_percentage:item.completion_percentage||0 })
    setShowModal(true)
  }

  async function save() {
    if (!form.description.trim()) return
    setSaving(true)
    const data = { priority_id:id, description:form.description, owner_id:form.owner_id||null, status:form.status, due_date:form.due_date||null, completion_percentage:parseInt(form.completion_percentage)||0 }
    if (editing) {
      const { error } = await supabase.from("action_items").update(data).eq("id", editing.id)
      if (error) { window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"error", message:"Error saving: "+error.message } })); setSaving(false); return }
    } else {
      const actionId = "action-" + Date.now()
      const { error } = await supabase.from("action_items").insert([{ id: actionId, ...data, archived:false }])
      if (error) { window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"error", message:"Error saving: "+error.message } })); setSaving(false); return }
    }
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message: editing ? "Action updated!" : "Action added!" } }))
    setShowModal(false)
    setSaving(false)
    loadData()
  }

  async function deleteAction(actionId) {
    if (!confirm("Delete this action item?")) return
    await supabase.from("action_items").delete().eq("id", actionId)
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message:"Action deleted!" } }))
    loadData()
  }

  async function archiveAction(actionId, archived) {
    await supabase.from("action_items").update({ archived: !archived }).eq("id", actionId)
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message: archived ? "Action restored!" : "Action archived!" } }))
    loadData()
  }

  // Drag and drop handlers
  function handleDragStart(e, itemId) {
    setDragId(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e, itemId) {
    e.preventDefault()
    if (dragId === itemId) return
    const activeItems = actionItems.filter(a => !a.archived)
    const dragged = activeItems.find(a => a.id === dragId)
    const target = activeItems.find(a => a.id === itemId)
    if (!dragged || !target) return
    const newOrder = activeItems.filter(a => a.id !== dragId)
    const targetIndex = newOrder.findIndex(a => a.id === itemId)
    newOrder.splice(targetIndex, 0, dragged)
    const archivedItems = actionItems.filter(a => a.archived)
    setActionItems([...newOrder, ...archivedItems])
  }

  async function handleDrop(e, itemId) {
    e.preventDefault()
    if (dragId === itemId) return
    const activeItems = actionItems.filter(a => !a.archived)
    for (let i = 0; i < activeItems.length; i++) {
      await supabase.from("action_items").update({ created_at: new Date(Date.now() + i * 1000).toISOString() }).eq("id", activeItems[i].id)
    }
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message:"Order saved!" } }))
    setDragId(null)
    loadData()
  }

  function handleDragEnd() {
    setDragId(null)
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  const activeActions = actionItems.filter(a => !a.archived)
  const archivedActions = actionItems.filter(a => a.archived)

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>
  if (!priority) return <Layout><div style={{color:"#64748b",padding:40}}>Priority not found</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="breadcrumb" style={{cursor:"pointer",color:"#4a90d9"}} onClick={() => router.push("/priorities")}>← Back to Priorities</div>
          <div className="page-title">{priority.title}</div>
          <div className="page-subtitle">Quarter: {priority.quarter_id} | Status: {priority.status}</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Action Item</button>
      </div>

      <div className="card" style={{marginBottom:24}}>
        <div>
          <div style={{fontSize:14,color:"#64748b",marginBottom:4}}>Overall Progress</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div className="progress-bar" style={{width:200}}><div className="progress-fill" style={{width:(priority.overall_completion||0)+"%"}} /></div>
            <span style={{fontSize:18,fontWeight:600,color:"#f1f5f9"}}>{priority.overall_completion||0}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button className={activeTab === "active" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("active")}>
          Active ({activeActions.length})
        </button>
        <button className={activeTab === "archived" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("archived")}>
          🗄️ Archived ({archivedActions.length})
        </button>
      </div>

      {/* Active Action Items - Draggable */}
      {activeTab === "active" && (
        <div className="card">
          <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>💡 Drag rows to reorder action items</div>
          {activeActions.length === 0 ? (
            <div className="empty-state">No action items yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{width:40}}></th>
                  <th>Action Item</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeActions.map(item => {
                  const owner = users.find(u => u.id === item.owner_id)
                  const isDragging = dragId === item.id
                  return (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragOver={e => handleDragOver(e, item.id)}
                      onDrop={e => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: isDragging ? 0.4 : 1,
                        background: isDragging ? "#334155" : "transparent",
                        cursor: "grab",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <td style={{color:"#64748b",fontSize:18,textAlign:"center",cursor:"grab"}}>⠿</td>
                      <td style={{fontWeight:500,color:"#f1f5f9"}}>{item.description}</td>
                      <td>{owner ? owner.full_name : "—"}</td>
                      <td>{statusBadge(item.status)}</td>
                      <td>{item.due_date || "—"}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div className="progress-bar" style={{width:60}}><div className="progress-fill" style={{width:(item.completion_percentage||0)+"%"}} /></div>
                          <span style={{fontSize:12,color:"#64748b"}}>{item.completion_percentage||0}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => archiveAction(item.id, item.archived)} style={{color:"#f59e0b"}}>Archive</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAction(item.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Archived Action Items */}
      {activeTab === "archived" && (
        <div className="card">
          {archivedActions.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🗄️</div><div>No archived action items</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Action Item</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivedActions.map(item => {
                  const owner = users.find(u => u.id === item.owner_id)
                  return (
                    <tr key={item.id} style={{opacity:0.7}}>
                      <td style={{fontWeight:500,color:"#94a3b8"}}>{item.description}</td>
                      <td>{owner ? owner.full_name : "—"}</td>
                      <td>{statusBadge(item.status)}</td>
                      <td>{item.due_date || "—"}</td>
                      <td>{item.completion_percentage||0}%</td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-secondary btn-sm" style={{color:"#10b981"}} onClick={() => archiveAction(item.id, item.archived)}>✅ Restore</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAction(item.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? "Edit Action Item" : "Add Action Item"}</div>
            <div className="form-group"><label>Description *</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Action item description..." autoFocus /></div>
            <div className="form-group"><label>Owner</label><select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})}><option value="">No owner</option>{users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
            <div className="form-group"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{["Not Started","In Progress","Complete","Blocked","On Hold"].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></div>
            <div className="form-group"><label>Completion %</label><input type="number" min="0" max="100" value={form.completion_percentage} onChange={e=>setForm({...form,completion_percentage:e.target.value})} onMouseDown={e => e.stopPropagation()} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner"></span> : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
