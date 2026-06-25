import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Annual() {
  const router = useRouter()
  const [accounts, setAccounts] = useState([])
  const [users, setUsers] = useState([])
  const [regions, setRegions] = useState([])
  const [segments, setSegments] = useState([])
  const [filter, setFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [manageTab, setManageTab] = useState("regions")
  const [newRegion, setNewRegion] = useState("")
  const [newSegment, setNewSegment] = useState("")
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:"", region:"", segment:"", revenue_towerco:0, revenue_other:0, notes:"", owner_id:"" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    const [{ data: a }, { data: u }, { data: r }, { data: s }] = await Promise.all([
      supabase.from("target_accounts").select("*").eq("active", true).order("name"),
      supabase.from("users").select("*").order("full_name"),
      supabase.from("regions").select("*").order("name"),
      supabase.from("segments").select("*").order("name"),
    ])
    setAccounts(a || [])
    setUsers(u || [])
    setRegions(r || [])
    setSegments(s || [])
  }

  function openAdd() {
    setEditing(null)
    setForm({ name:"", region: regions[0]?.name||"", segment: segments[0]?.name||"", revenue_towerco:0, revenue_other:0, notes:"", owner_id:"" })
    setShowModal(true)
  }

  function openEdit(a) {
    setEditing(a)
    setForm({ name:a.name, region:a.region||"", segment:a.segment||"", revenue_towerco:a.revenue_towerco||0, revenue_other:a.revenue_other||0, notes:a.notes||"", owner_id:a.owner_id||"" })
    setShowModal(true)
  }

  async function save() {
    if (!form.name.trim()) return
    const data = { name:form.name, region:form.region, segment:form.segment, revenue_towerco:parseFloat(form.revenue_towerco)||0, revenue_other:parseFloat(form.revenue_other)||0, notes:form.notes||null, owner_id:form.owner_id||null, active:true }
    if (editing) {
      const { error } = await supabase.from("target_accounts").update(data).eq("id", editing.id)
      if (error) { alert("Error saving: " + error.message); return }
    } else {
      const id = "target-" + Date.now()
      const { error } = await supabase.from("target_accounts").insert([{ id, ...data }])
      if (error) { alert("Error saving: " + error.message); return }
    }
    setShowModal(false); loadData()
  }

  async function deleteAccount(id) {
    if (!confirm("Delete this account?")) return
    await supabase.from("target_accounts").update({ active:false }).eq("id", id)
    loadData()
  }

  async function addRegion() {
    if (!newRegion.trim()) return
    const id = "region-" + Date.now()
    const { error } = await supabase.from("regions").insert([{ id, name: newRegion.trim() }])
    if (error) { alert("Error: " + error.message); return }
    setNewRegion("")
    loadData()
  }

  async function deleteRegion(id) {
    if (!confirm("Delete this region?")) return
    await supabase.from("regions").delete().eq("id", id)
    loadData()
  }

  async function addSegment() {
    if (!newSegment.trim()) return
    const id = "segment-" + Date.now()
    const { error } = await supabase.from("segments").insert([{ id, name: newSegment.trim() }])
    if (error) { alert("Error: " + error.message); return }
    setNewSegment("")
    loadData()
  }

  async function deleteSegment(id) {
    if (!confirm("Delete this segment?")) return
    await supabase.from("segments").delete().eq("id", id)
    loadData()
  }

  const filtered = filter === "all" ? accounts : accounts.filter(a => a.region === filter)
  const totalTowerCo = filtered.reduce((s,a) => s + (a.revenue_towerco||0), 0)
  const totalOther = filtered.reduce((s,a) => s + (a.revenue_other||0), 0)
  const fmt = n => n >= 1000000 ? "$"+(n/1000000).toFixed(1)+"M" : n >= 1000 ? "$"+(n/1000).toFixed(0)+"K" : "$"+n

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Annual Priorities</div><div className="page-subtitle">Target accounts and revenue tracking</div></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-secondary" onClick={() => setShowManageModal(true)}>⚙️ Manage Lists</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Account</button>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="stat-label">Total Accounts</div><div className="stat-value">{filtered.length}</div></div>
        <div className="stat-card"><div className="stat-label">TowerCo Revenue</div><div className="stat-value" style={{color:"#10b981"}}>{fmt(totalTowerCo)}</div><div className="stat-sub">target</div></div>
        <div className="stat-card"><div className="stat-label">Other Revenue</div><div className="stat-value" style={{color:"#4a90d9"}}>{fmt(totalOther)}</div><div className="stat-sub">target</div></div>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{fmt(totalTowerCo+totalOther)}</div><div className="stat-sub">combined target</div></div>
      </div>

      <div className="filters">
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Regions</option>
          {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📊 {filter === "all" ? "All Regions" : filter}</div>
          <span className="badge badge-blue">{filtered.length} accounts</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{color:"#4a6080",fontSize:13,padding:"8px 0"}}>No accounts found.</div>
        ) : (
          <table>
            <thead><tr><th>Account</th><th>Region</th><th>Segment</th><th>TowerCo Revenue</th><th>Other Revenue</th><th>Owner</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(a => {
                const u = users.find(u => u.id === a.owner_id)
                return (
                  <tr key={a.id}>
                    <td style={{fontWeight:500,color:"#f1f5f9"}}>{a.name}</td>
                    <td>{a.region || "-"}</td>
                    <td><span className="badge badge-blue">{a.segment}</span></td>
                    <td style={{color:"#10b981"}}>{a.revenue_towerco > 0 ? fmt(a.revenue_towerco) : "-"}</td>
                    <td style={{color:"#4a90d9"}}>{a.revenue_other > 0 ? fmt(a.revenue_other) : "-"}</td>
                    <td>{u ? u.full_name : "-"}</td>
                    <td style={{fontSize:12,color:"#64748b",maxWidth:200}}>{a.notes || "-"}</td>
                    <td>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(a)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>deleteAccount(a.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Account Modal */}
      {showModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? "Edit Account" : "Add Target Account"}</div>
            <div className="form-group"><label>Account Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Account name..." /></div>
            <div className="form-group"><label>Region</label>
              <select value={form.region} onChange={e=>setForm({...form,region:e.target.value})}>
                <option value="">Select region...</option>
                {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Segment</label>
              <select value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})}>
                <option value="">Select segment...</option>
                {segments.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>TowerCo Revenue Target ($)</label><input type="number" value={form.revenue_towerco} onChange={e=>setForm({...form,revenue_towerco:e.target.value})} onMouseDown={e => e.stopPropagation()} /></div>
            <div className="form-group"><label>Other Revenue Target ($)</label><input type="number" value={form.revenue_other} onChange={e=>setForm({...form,revenue_other:e.target.value})} onMouseDown={e => e.stopPropagation()} /></div>
            <div className="form-group"><label>Owner</label>
              <select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})}>
                <option value="">No owner</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Notes / Importance</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Why is this account important..." /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? "Save Changes" : "Add Account"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Regions & Segments Modal */}
      {showManageModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowManageModal(false) }}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-title">⚙️ Manage Lists</div>

            {/* Tabs */}
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <button
                className={"btn " + (manageTab === "regions" ? "btn-primary" : "btn-secondary")}
                onClick={() => setManageTab("regions")}
              >Regions</button>
              <button
                className={"btn " + (manageTab === "segments" ? "btn-primary" : "btn-secondary")}
                onClick={() => setManageTab("segments")}
              >Segments</button>
            </div>

            {manageTab === "regions" && (
              <div>
                <div style={{marginBottom:12}}>
                  {regions.map(r => (
                    <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e3a5f"}}>
                      <span style={{color:"#f1f5f9"}}>{r.name}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteRegion(r.id)}>Delete</button>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input
                    value={newRegion}
                    onChange={e => setNewRegion(e.target.value)}
                    placeholder="New region name..."
                    style={{flex:1}}
                    onKeyDown={e => e.key === "Enter" && addRegion()}
                  />
                  <button className="btn btn-primary" onClick={addRegion}>Add</button>
                </div>
              </div>
            )}

            {manageTab === "segments" && (
              <div>
                <div style={{marginBottom:12}}>
                  {segments.map(s => (
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e3a5f"}}>
                      <span style={{color:"#f1f5f9"}}>{s.name}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteSegment(s.id)}>Delete</button>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input
                    value={newSegment}
                    onChange={e => setNewSegment(e.target.value)}
                    placeholder="New segment name..."
                    style={{flex:1}}
                    onKeyDown={e => e.key === "Enter" && addSegment()}
                  />
                  <button className="btn btn-primary" onClick={addSegment}>Add</button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowManageModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
