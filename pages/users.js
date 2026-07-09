import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was the name of your first school?",
  "What is your favorite food?",
]

export default function Users() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name:"", username:"", password:"", role:"", email:"", security_question:"", security_answer:"" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    if (localStorage.getItem("aw_user_id") !== "admin") { router.push("/dashboard"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from("users").select("*").order("full_name")
    setUsers(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ full_name:"", username:"", password:"", role:"", email:"", security_question:"", security_answer:"" })
    setShowModal(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({
      full_name: u.full_name || "",
      username: u.username || "",
      password: "",
      role: u.role || "",
      email: u.email || "",
      security_question: u.security_question || "",
      security_answer: u.security_answer || "",
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.full_name.trim()) { alert("Full name is required."); return }
    if (!form.username.trim()) { alert("Username is required."); return }

    const data = {
      full_name: form.full_name,
      username: form.username.trim(),
      role: form.role || null,
      email: form.email || null,
      security_question: form.security_question || null,
      security_answer: form.security_answer ? form.security_answer.trim().toLowerCase() : null,
    }
    // Only set password if provided (so editing doesn't wipe it)
    if (form.password) data.password = form.password

    if (editing) {
      const { error } = await supabase.from("users").update(data).eq("id", editing.id)
      if (error) { alert("Error saving: " + error.message); return }
    } else {
      if (!form.password) { alert("Password is required for new users."); return }
      const id = "user-" + form.full_name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()
      const { error } = await supabase.from("users").insert([{ id, ...data }])
      if (error) { alert("Error saving: " + error.message); return }
    }
    setShowModal(false)
    loadData()
  }

  async function deleteUser(id) {
    if (!confirm("Delete this user?")) return
    await supabase.from("users").delete().eq("id", id)
    loadData()
  }

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Team Members</div><div className="page-subtitle">Manage your team</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Team Member</button>
      </div>
      <div className="card">
        {users.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><div>No team members yet. Add your first one!</div></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Security Q</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:500,color:"#f1f5f9"}}>{u.full_name}</td>
                  <td>{u.username || "—"}</td>
                  <td>{u.role || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td style={{fontSize:12}}>
                    {u.security_question ? (
                      <span style={{color:"#10b981"}}>✓ Set</span>
                    ) : (
                      <span style={{color:"#ef4444"}}>✗ Not set</span>
                    )}
                  </td>
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
        <div
          className="modal-overlay"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-title">{editing ? "Edit Team Member" : "Add Team Member"}</div>

            <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Full name..." /></div>
            <div className="form-group"><label>Username *</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="e.g. jsmith" /></div>
            <div className="form-group">
              <label>Password {editing ? "(leave blank to keep current)" : "*"}</label>
              <input type="text" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={editing ? "Unchanged" : "Set a password"} />
            </div>
            <div className="form-group"><label>Role</label><input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="e.g. Sales Manager, Engineer..." /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@example.com" /></div>

            <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #334155"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12}}>🔒 Security Question (for password recovery)</div>
              <div className="form-group">
                <label>Question</label>
                <select value={form.security_question} onChange={e=>setForm({...form,security_question:e.target.value})}>
                  <option value="">Select a question...</option>
                  {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Answer</label>
                <input value={form.security_answer} onChange={e=>setForm({...form,security_answer:e.target.value})} placeholder="Answer (case-insensitive)" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? "Save Changes" : "Add Team Member"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
