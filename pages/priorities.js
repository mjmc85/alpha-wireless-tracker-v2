import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Priorities() {
  const router = useRouter()
  const [priorities, setPriorities] = useState([])
  const [quarters, setQuarters] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:"", quarter_id:"", owner_id:"", status:"Not Started", overall_completion:0, priority_number:1 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])
 
  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: q }, { data: u }] = await Promise.all([
      supabase.from("priorities").select("*").order("priority_number"),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setPriorities(p || [])
    setQuarters(q || [])
    setUsers(u || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ title:"", quarter_id: quarters[0]?.id||"", owner_id:"", status:"Not Started", overall_completion:0, priority_number:(priorities.length+1) })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ title:p.title, quarter_id:p.quarter_id||"", owner_id:p.owner_id||"", status:p.status, overall_completion:p.overall_completion||0, priority_number:p.priority_number })
    setShowModal(true)
  }
async function save() {
  if (!form.title.trim()) return
  const data = { title:form.title, quarter_id:form.quarter_id, owner_id:form.owner_id||null, status:form.status, overall_completion:parseInt(form.overall_completion)||0, priority_number:parseInt(form.priority_number)||1, last_updated:new Date().toISOString().split("T")[0] }
  if (editing) {
    await supabase.from("priorities").update(data).eq("id", editing.id)
  } else {
    const id = "priority-" + Date.now()
    const { error } = await supabase.from("priorities").insert([{ id, ...data }])
    if (error) { alert("Error saving: " + error.message); return }
  }
  setShowModal(false)
  loadData()
}

  async function deletePriority(id) {
    if (!confirm("Delete this priority and all its action items?")) return
    await supabase.from("action_items").delete().eq("priority_id", id)
    await supabase.from("priorities").delete().eq("id", id)
    loadData()
  }

  function statusBadge(s) {
    const map = { "Complete":"badge-green","In Progress":"badge-blue","Not Started":"badge-gray","Blocked":"badge-red","On Hold":"badge-yellow" }
    return <span className={"badge " + (map[s]||"badge-gray")}>{s}</span>
  }

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Priorities</div><div className="page-subtitle">Manage company priorities</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Priority</button>
      </div>
      <div className="card">
        {priorities.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><div>No priorities yet. Add your first one!</div></div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Priority</th><th>Quarter</th><th>Status</th><th>Progress</th><th>Actions</th></tr></thead>
            <tbody>
              {priorities.map(p => {
                const q = quarters.find(q => q.id === p.quarter_id)
                return (
                  <tr key={p.id}>
                    <td style={{color:"#4a90d9",fontWeight:600}}>{p.priority_number}</td>
                    <td style={{fontWeight:500,color:"#f1f5f9",cursor:"pointer"}} onClick={() => router.push("/priority/"+p.id)}>{p.title}</td>
                    <td>{q ? <span className="badge badge-blue">{q.title}</span> : "—"}</td>
                    <td>{statusBadge(p.status)}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div className="progress-bar" style={{width:80}}><div className="progress-fill" style={{width:(p.overall_completion||0)+"%"}} /></div>
                        <span style={{fontSize:12,color:"#64748b"}}>{p.overall_completion||0}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => router.push("/priority/"+p.id)}>View</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
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

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? "Edit Priority" : "Add Priority"}</div>
            <div className="form-group"><label>Priority Number</label><input type="number" value={form.priority_number} onChange={e=>setForm({...form,priority_number:e.target.value})} /></div>
            <div className="form-group"><label>Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Priority title..." /></div>
            <div className="form-group"><label>Quarter</label>
              <select value={form.quarter_id} onChange={e=>setForm({...form,quarter_id:e.target.value})}>
                <option value="">Select quarter...</option>
                {quarters.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
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
            <div className="form-group"><label>Overall Completion %</label><input type="number" min="0" max="100" value={form.overall_completion} onChange={e=>setForm({...form,overall_completion:e.target.value})} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? "Save Changes" : "Add Priority"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
