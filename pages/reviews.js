import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Reviews() {
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [quarters, setQuarters] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ quarter_id:"", worked:["","",""], didnt_work:["","",""], changes_to_make:["","",""] })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    const [{ data: r }, { data: q }] = await Promise.all([
      supabase.from("quarterly_reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("quarters").select("*").order("year").order("quarter_number"),
    ])
    setReviews(r || [])
    setQuarters(q || [])
  }

  function openAdd() {
    setEditing(null)
    setForm({ quarter_id:quarters[0]?.id||"", worked:["","",""], didnt_work:["","",""], changes_to_make:["","",""] })
    setShowModal(true)
  }

  function openEdit(r) {
    setEditing(r)
    setForm({
      quarter_id: r.quarter_id||"",
      worked: [...(r.worked||[]),"","",""].slice(0,3),
      didnt_work: [...(r.didnt_work||[]),"","",""].slice(0,3),
      changes_to_make: [...(r.changes_to_make||[]),"","",""].slice(0,3),
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.quarter_id) return
    const data = {
      quarter_id: form.quarter_id,
      worked: form.worked.filter(x=>x.trim()),
      didnt_work: form.didnt_work.filter(x=>x.trim()),
      changes_to_make: form.changes_to_make.filter(x=>x.trim()),
    }
    if (editing) { await supabase.from("quarterly_reviews").update(data).eq("id", editing.id) }
    else { await supabase.from("quarterly_reviews").insert([data]) }
    setShowModal(false); loadData()
  }

  async function deleteReview(id) {
    if (!confirm("Delete this review?")) return
    await supabase.from("quarterly_reviews").delete().eq("id", id)
    loadData()
  }

  function updateItem(field, idx, val) {
    const arr = [...form[field]]; arr[idx] = val; setForm({...form,[field]:arr})
  }

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Quarterly Reviews</div><div className="page-subtitle">Review what worked, what didn't, and what to change</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Review</button>
      </div>

      {reviews.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🔍</div><div>No quarterly reviews yet.</div></div></div>
      ) : (
        reviews.map(r => {
          const q = quarters.find(q => q.id === r.quarter_id)
          return (
            <div key={r.id} className="card">
              <div className="card-header">
                <div className="card-title">{q ? q.title : "Unknown Quarter"} — Quarterly Review</div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(r)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>deleteReview(r.id)}>Delete</button>
                </div>
              </div>
              <div className="grid-2" style={{gap:16}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#10b981",marginBottom:8,textTransform:"uppercase"}}>✅ What Worked</div>
                  {(r.worked||[]).map((w,i) => <div key={i} style={{fontSize:13,color:"#cbd5e1",padding:"4px 0",borderBottom:"1px solid #0f2847"}}>• {w}</div>)}
                  {(!r.worked||r.worked.length===0) && <div style={{color:"#4a6080",fontSize:13}}>None recorded</div>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#ef4444",marginBottom:8,textTransform:"uppercase"}}>❌ What Didn't Work</div>
                  {(r.didnt_work||[]).map((w,i) => <div key={i} style={{fontSize:13,color:"#cbd5e1",padding:"4px 0",borderBottom:"1px solid #0f2847"}}>• {w}</div>)}
                  {(!r.didnt_work||r.didnt_work.length===0) && <div style={{color:"#4a6080",fontSize:13}}>None recorded</div>}
                </div>
              </div>
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:8,textTransform:"uppercase"}}>🔄 Changes We'll Make</div>
                {(r.changes_to_make||[]).map((w,i) => <div key={i} style={{fontSize:13,color:"#cbd5e1",padding:"4px 0",borderBottom:"1px solid #0f2847"}}>• {w}</div>)}
                {(!r.changes_to_make||r.changes_to_make.length===0) && <div style={{color:"#4a6080",fontSize:13}}>None recorded</div>}
              </div>
            </div>
          )
        })
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing?"Edit Review":"New Quarterly Review"}</div>
            <div className="form-group"><label>Quarter *</label>
              <select value={form.quarter_id} onChange={e=>setForm({...form,quarter_id:e.target.value})}>
                <option value="">Select quarter...</option>
                {quarters.map(q=><option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:"#10b981",margin:"16px 0 8px",textTransform:"uppercase"}}>✅ What Worked (up to 3)</div>
            {[0,1,2].map(i=><div key={i} className="form-group"><input value={form.worked[i]||""} onChange={e=>updateItem("worked",i,e.target.value)} placeholder={`Item ${i+1}...`} /></div>)}
            <div style={{fontSize:12,fontWeight:700,color:"#ef4444",margin:"16px 0 8px",textTransform:"uppercase"}}>❌ What Didn't Work (up to 3)</div>
            {[0,1,2].map(i=><div key={i} className="form-group"><input value={form.didnt_work[i]||""} onChange={e=>updateItem("didnt_work",i,e.target.value)} placeholder={`Item ${i+1}...`} /></div>)}
            <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",margin:"16px 0 8px",textTransform:"uppercase"}}>🔄 Changes We'll Make (up to 3)</div>
            {[0,1,2].map(i=><div key={i} className="form-group"><input value={form.changes_to_make[i]||""} onChange={e=>updateItem("changes_to_make",i,e.target.value)} placeholder={`Change ${i+1}...`} /></div>)}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing?"Save Changes":"Add Review"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
