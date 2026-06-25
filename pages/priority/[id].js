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
    const data = { priority_id:id, description:form.description, owner_id:form.owner_id||null, status:form.status, due_date:form.due_date||null, completion_percentage:parseInt(form.completion_percentage)||0 }
    if (editing) {
      await supabase.from("action_items").update(data).eq("id", editing.id)
    } else {
      const actionId = "action-" + Date.now()
      const { error } = await supabase.from("action_items").insert([{ id: actionId, ...data }])
      if (error) { alert("Error saving: " + error.message); return }
    }
    setShowModal(false)
    loadData()
    updatePriorityCompletion()
  }

  async function updatePriorityCompletion() {
    const { data: items } = await supabase.from("action_items").select("completion_percentage").eq("priority_id", id)
    if (items && items.length > 0) {
      const avg = Math.round(items.reduce((sum, i) => sum + (i.completion_percentage || 0), 0) / items.length)
      await supabase.from("priorities").update({ overall_completion: avg }).eq("id", id)
    }
  }

  async function deleteAction(actionId) {
    if (!confirm("Delete this action item?")) return
    await supabase.from("action_items").delete().eq("id", actionId)
    loadData()
    updatePriorityCompletion()
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,color:"#64748b",marginBottom:4}}>Overall Progress</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div className="progress-bar" style={{width:200}}><div className="progress-fill" style={{width:(priority.overall_completion||0)+"%"}} /></div>
              <span style={{fontSize:18,fontWeight:600,color:"#f1f5f9"}}>{priority.overall_completion||0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:16,fontWeight:600,color:"#f1f5f9",marginBottom:16}}>Action Items</div>
        {actionItems.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✅</div><div>No action items yet. Add your first one!</div></div>
        ) : (
          <table>
            <thead><tr><th>Action Item</th><th>Owner</th><th>Status</th><th>Due Date</th><th>Progress</th><th>Actions</th></tr></thead>
            <tbody>
              {actionItems.map(item => {
                const owner = users.find(u => u.id === item.owner_id)
                return (
                  <tr key={item.id}>
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

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? "Edit Action Item" : "Add Action Item"}</div>
            <div className="form-group"><label>Description *</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Action item description..." /></div>
            <div className="form-group"><label>Owner</label>
              <select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})}>
                <option value="">No owner</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {["Not Started","In Progress","Complete","Blocked","On Hold"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></div>
            <div className="form-group"><label>Completion %</label><input type="number" min="0" max="100" value={form.completion_percentage} onChange={e=>setForm({...form,completion_percentage:e.target.value})} onMouseDown={e => e.stopPropagation()} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? "Save Changes" : "Add Action Item"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
