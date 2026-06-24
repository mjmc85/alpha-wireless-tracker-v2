import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../../components/Layout"
import { supabase } from "../../lib/supabase"

export default function Meetings() {
  const router = useRouter()
  const [meetings, setMeetings] = useState([])
  const [quarters, setQuarters] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title:"", meeting_date:"", meeting_time:"", quarter_id:"", teams_link:"", notes:"" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    const [{ data: m }, { data: q }] = await Promise.all([
      supabase.from("meetings").select("*").order("meeting_date", { ascending: false }),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
    ])
    setMeetings(m || [])
    setQuarters(q || [])
  }

  async function save() {
    if (!form.title.trim() || !form.meeting_date) return
    await supabase.from("meetings").insert([{ title:form.title, meeting_date:form.meeting_date, meeting_time:form.meeting_time||null, quarter_id:form.quarter_id||null, teams_link:form.teams_link||null, notes:form.notes||null }])
    setShowModal(false); loadData()
  }

  async function deleteMeeting(id) {
    if (!confirm("Delete this meeting?")) return
    await supabase.from("meeting_agenda_items").delete().eq("meeting_id", id)
    await supabase.from("meetings").delete().eq("id", id)
    loadData()
  }

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Meetings</div><div className="page-subtitle">Schedule and run team meetings</div></div>
        <button className="btn btn-primary" onClick={() => { setForm({ title:"", meeting_date:"", meeting_time:"", quarter_id:quarters[0]?.id||"", teams_link:"", notes:"" }); setShowModal(true) }}>+ New Meeting</button>
      </div>
      <div className="card">
        {meetings.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🤝</div><div>No meetings yet. Schedule your first one!</div></div>
        ) : (
          <table>
            <thead><tr><th>Meeting</th><th>Date</th><th>Time</th><th>Quarter</th><th>Teams</th><th>Actions</th></tr></thead>
            <tbody>
              {meetings.map(m => {
                const q = quarters.find(q => q.id === m.quarter_id)
                return (
                  <tr key={m.id}>
                    <td style={{fontWeight:500,color:"#f1f5f9",cursor:"pointer"}} onClick={() => router.push("/meetings/"+m.id)}>{m.title}</td>
                    <td>{m.meeting_date}</td>
                    <td>{m.meeting_time || "—"}</td>
                    <td>{q ? <span className="badge badge-blue">{q.title}</span> : "—"}</td>
                    <td>{m.teams_link ? <a href={m.teams_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Join →</a> : "—"}</td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => router.push("/meetings/"+m.id)}>Open</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteMeeting(m.id)}>Delete</button>
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
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">New Meeting</div>
            <div className="form-group"><label>Meeting Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Weekly Team Huddle" /></div>
            <div className="form-group"><label>Date *</label><input type="date" value={form.meeting_date} onChange={e=>setForm({...form,meeting_date:e.target.value})} /></div>
            <div className="form-group"><label>Time</label><input type="time" value={form.meeting_time} onChange={e=>setForm({...form,meeting_time:e.target.value})} /></div>
            <div className="form-group"><label>Quarter</label>
              <select value={form.quarter_id} onChange={e=>setForm({...form,quarter_id:e.target.value})}>
                <option value="">Select quarter...</option>
                {quarters.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Teams Meeting Link</label><input value={form.teams_link} onChange={e=>setForm({...form,teams_link:e.target.value})} placeholder="Paste Teams meeting URL..." /></div>
            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any notes..." /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Create Meeting</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
