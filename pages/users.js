import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Users() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name:"", role:"", email:"" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    const { data } = await supabase.from("users").select("*").order("full_name")
    setUsers(data || [])
  }

  function openAdd() { setEditing(null); setForm({ full_name:"", role:"", email:"" }); setShowModal(true) }
  function openEdit(u) { setEditing(u); setForm({ full_name:u.full_name, role:u.role||"", email:u.email||"" }); setShowModal(true) }

  async function save() {
    if (!form.full_name.trim()) return
    const id = "user-" + form.full_name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()
    const data = { id, full_name:form.full_name, role:form.role||null, email:form.email||null }
    if (editing) { 
      const updateData = { full_name:form.full_name, role:form.role||null, email:form.email||null }
      await supabase.from("users").update(updateData).eq("id", editing.id) 
    } else { 
      const { error } = await supabase.from("users").insert([data])
      if (error) { alert("Error saving: " + error.message); return }
    }
    setShowModal(false); loadData()
  }

  async function deleteUser(id) {
    if (!confirm("Delete this team member?")) return
    await supabase.from("users").delete().eq("id", id)
    loadData()
  }

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Team Members</div><div className="page-subtitle">Manage your team</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Member</button>
      </div>
      <div className="card">
        {users.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><div>No team members yet.</div></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:500,color:"#f1f5f9"}}>{u.full_name}</td>
                  <td>{u.role || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? "Edit Member" : "Add Team Member"}</div>
            <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Full name..." /></div>
            <div className="form-group"><label>Role</label><input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="e.g. Supply Chain Lead" /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@company.com" /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing?"Save Changes":"Add Member"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
