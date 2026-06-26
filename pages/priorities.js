import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Priorities() {
  const router = useRouter()
  const [priorities, setPriorities] = useState([])
  const [quarters, setQuarters] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:"", quarter_id:"", status:"Not Started", priority_number:1 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active")
  const [dragId, setDragId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: q }] = await Promise.all([
      supabase.from("priorities").select("*").order("priority_number"),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
    ])
    setPriorities(p || [])
    setQuarters(q || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    const nextNum = priorities.filter(p => !p.archived).length + 1
    setForm({ title:"", quarter_id: quarters[0]?.id || "", status:"Not Started", priority_number: nextNum })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ title:p.title, quarter_id:p.quarter_id||"", status:p.status, priority_number:p.priority_number||1 })
    setShowModal(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const data = { title:form.title, quarter_id:form.quarter_id||null, status:form.status, priority_number:parseInt(form.priority_number)||1 }
    if (editing) {
      const { error } = await supabase.from("priorities").update(data).eq("id", editing.id)
      if (error) { window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"error", message:"Error saving: "+error.message } })); setSaving(false); return }
    } else {
      const id = "priority-" + Date.now()
      const { error } = await supabase.from("priorities").insert([{ id, ...data, overall_completion:0, archived:false }])
      if (error) { window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"error", message:"Error saving: "+error.message } })); setSaving(false); return }
    }
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message: editing ? "Priority updated!" : "Priority added!" } }))
    setShowModal(false)
    setSaving(false)
    loadData()
  }

  async function deletePriority(id) {
    if (!confirm("Delete this priority and all its action items?")) return
    await supabase.from("action_items").delete().eq("priority_id", id)
    await supabase.from("priorities").delete().eq("id", id)
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message:"Priority deleted!" } }))
    loadData()
  }

  async function archivePriority(id, archived) {
    await supabase.from("priorities").update({ archived: !archived }).eq("id", id)
    window.dispatchEvent(new CustomEvent("showToast", { detail: { type:"success", message: archived ? "Priority restored!" : "Priority archived!" } }))
    loadData()
  }

  // Drag and drop handlers
  function handleDragStart(e, id) {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e, id) {
    e.preventDefault()
    if (dragId === id) return
    const dragged = activePriorities.find(p => p.id === dragId)
    const target = activePriorities.find(p => p.id === id)
    if (!dragged || !target) return
    const newOrder = activePriorities.filter(p => p.id !== dragId)
    const targetIndex = newOrder.findIndex(p => p.id === id)
    newOrder.splice(targetIndex, 0, dragged)
    const updated = newOrder.map((p, i) => ({ ...p, priority_number: i + 1 }))
    setPriorities([...updated, ...archivedPriorities])
  }

  async function handleDrop(e, id) {
    e.preventDefault()
    if (dragId === id) return
    const updates = activePriorities.map((p, i) => ({ id: p.id, priority_number: i + 1 }))
    for (const u of updates) {
      await supabase.from("priorities").update({ priority_number: u.priority_number }).eq("id", u.id)
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

  const activePriorities = priorities.filter(p => !p.archived)
  const archivedPriorities = priorities.filter(p => p.archived)

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">📋 Priorities</div>
          <div className="page-subtitle">{activePriorities.length} active · {archivedPriorities.length} archived</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Priority</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:24}}>
        <button className={activeTab === "active" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("active")}>
          Active ({activePriorities.length})
        </button>
        <button className={activeTab === "archived" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("archived")}>
          🗄️ Archived ({archivedPriorities.length})
        </button>
      </div>

      {/* Active Priorities - Draggable */}
      {activeTab === "active" && (
        <div className="card">
          {activePriorities.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><div>No priorities yet. Add your first one!</div></div>
          ) : (
            <>
              <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>💡 Drag rows to reorder priorities</div>
              <table>
                <thead>
                  <tr>
                    <th style={{width:40}}></th>
                    <th>#</th>
                    <th>Priority</th>
                    <th>Quarter</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePriorities.map(p => {
                    const q = quarters.find(q => q.id === p.quarter_id)
                    const isDragging = dragId === p.id
                    return (
                      <tr
                        key={p.id}
                        draggable
                        onDragStart={e => handleDragStart(e, p.id)}
                        onDragOver={e => handleDragOver(e, p.id)}
                        onDrop={e => handleDrop(e, p.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          opacity: isDragging ? 0.4 : 1,
                          background: isDragging ? "#334155" : "transparent",
                          cursor: "grab",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <td style={{color:"#64748b",fontSize:18,textAlign:"center",cursor:"grab"}}>⠿</td>
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
                        <td>
                          <div style={{display:"flex",gap:6}}>
                            <button className="btn btn-secondary btn-sm" onClick={() => router.push("/priority/"+p.id)}>View</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => archivePriority(p.id, p.archived)} style={{color:"#f59e0b"}}>Archive</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deletePriority(p.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Archived Priorities */}
      {activeTab === "archived" && (
        <div className="card">
          {archivedPriorities.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🗄️</div><div>No archived priorities</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Priority</th>
                  <th>Quarter</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivedPriorities.map(p => {
                  const q = quarters.find(q => q.id === p.quarter_id)
                  return (
                    <tr key={p.id} style={{opacity:0.7}}>
                      <td style={{color:"#4a90d9",fontWeight:600}}>{p.priority_number}</td>
                      <td style={{fontWeight:500,color:"#94a3b8"}}>{p.title}</td>
                      <td>{q ? <span className="badge badge-blue">{q.title}</span> : "—"}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div className="progress-bar" style={{width:80}}><div className="progress-fill" style={{width:(p.overall_completion||0)+"%"}}></div></div>
                          <span style={{fontSize:12,color:"#64748b"}}>{p.overall_completion||0}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-secondary btn-sm" style={{color:"#10b981"}} onClick={() => archivePriority(p.id, p.archived)}>✅ Restore</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deletePriority(p.id)}>Delete</button>
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
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? "Edit Priority" : "Add Priority"}</div>
            <div className="form-group">
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Priority title..." autoFocus />
            </div>
            <div className="form-group">
              <label>Quarter</label>
              <select value={form.quarter_id} onChange={e => setForm({...form,quarter_id:e.target.value})}>
                <option value="">No quarter</option>
                {quarters.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                {["Not Started","In Progress","Complete","Blocked","On Hold"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority Number</label>
              <input type="number" min="1" value={form.priority_number} onChange={e => setForm({...form,priority_number:e.target.value})} onMouseDown={e => e.stopPropagation()} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="spinner"></span> : editing ? "Save Changes" : "Add Priority"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
