import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Quarters() {
  const router = useRouter()
  const [quarters, setQuarters] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:"", year:2026, quarter_number:3, start_date:"", end_date:"", status:"Upcoming" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    const { data } = await supabase.from("quarters").select("*").order("year").order("quarter_number")
    setQuarters(data || [])
  }

  function openAdd() { setEditing(null); setForm({ title:"", year:2026, quarter_number:3, start_date:"", end_date:"", status:"Upcoming" }); setShowModal(true) }
  function openEdit(q) { setEditing(q); setForm({ title:q.title, year:q.year, quarter_number:q.quarter_number, start_date:q.start_date||"", end_date:q.end_date||"", status:q.status }); setShowModal(true) }

  async function save() {
  if (!form.title.trim()) return

  const data = {
    title: form.title,
    year: parseInt(form.year),
    quarter_number: parseInt(form.quarter_number),
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    status: form.status
  }

  if (editing) {
    const { error } = await supabase.from("quarters").update(data).eq("id", editing.id)
    if (error) { alert("Error saving: " + error.message); return }
  } else {
    // create a stable id like: q-2026-2
    const id = `q-${data.year}-${data.quarter_number}`
    const { error } = await supabase.from("quarters").insert([{ id, ...data }])
    if (error) { alert("Error saving: " + error.message); return }
  }

  setShowModal(false)
  loadData()
}

  async function deleteQuarter(id) {
    if (!confirm("Delete this quarter?")) return
    await supabase.from("quarters").delete().eq("id", id)
    loadData()
  }

  function statusBadge(s) {
    const map = { "Active":"badge-green","Upcoming":"badge-blue","Complete":"badge-gray" }
    return <span className={"badge "+(map[s]||"badge-gray")}>{s}</span>
  }

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Quarters</div><div className="page-subtitle">Manage planning quarters</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Quarter</button>
      </div>
      <div className="card">
        {quarters.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div><div>No quarters yet.</div></div>
        ) : (
          <table>
            <thead><tr><th>Quarter</th><th>Year</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {quarters.map(q => (
                <tr key={q.id}>
                  <td style={{fontWeight:600,color:"#f1f5f9"}}>{q.title}</td>
                  <td>{q.year}</td>
                  <td>{q.start_date || "—"}</td>
                  <td>{q.end_date || "—"}</td>
                  <td>{statusBadge(q.status)}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(q)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>deleteQuarter(q.id)}>Delete</button>
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
            <div className="modal-title">{editing ? "Edit Quarter" : "Add Quarter"}</div>
            <div className="form-group"><label>Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Q3 2026" /></div>
            <div className="form-group"><label>Year</label><input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})} /></div>
            <div className="form-group"><label>Quarter Number</label>
              <select value={form.quarter_number} onChange={e=>setForm({...form,quarter_number:e.target.value})}>
                <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
              </select>
            </div>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {["Upcoming","Active","Complete"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing?"Save Changes":"Add Quarter"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
