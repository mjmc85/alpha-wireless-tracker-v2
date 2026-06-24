import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Annual() {
  const router = useRouter()
  const [accounts, setAccounts] = useState([])
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:"", region:"North America", segment:"TowerCo", revenue_towerco:0, revenue_other:0, notes:"", owner_id:"" })

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    const [{ data: a }, { data: u }] = await Promise.all([
      supabase.from("target_accounts").select("*").eq("active", true).order("name"),
      supabase.from("users").select("*").order("full_name"),
    ])
    setAccounts(a || [])
    setUsers(u || [])
  }

  function openAdd() { setEditing(null); setForm({ name:"", region:"North America", segment:"TowerCo", revenue_towerco:0, revenue_other:0, notes:"", owner_id:"" }); setShowModal(true) }
  function openEdit(a) { setEditing(a); setForm({ name:a.name, region:a.region||"North America", segment:a.segment||"TowerCo", revenue_towerco:a.revenue_towerco||0, revenue_other:a.revenue_other||0, notes:a.notes||"", owner_id:a.owner_id||"" }); setShowModal(true) }

  async function save() {
    if (!form.name.trim()) return
    const data = { name:form.name, region:form.region, segment:form.segment, revenue_towerco:parseFloat(form.revenue_towerco)||0, revenue_other:parseFloat(form.revenue_other)||0, notes:form.notes||null, owner_id:form.owner_id||null, active:true }
    if (editing) { await supabase.from("target_accounts").update(data).eq("id", editing.id) }
    else { await supabase.from("target_accounts").insert([data]) }
    setShowModal(false); loadData()
  }

  async function deleteAccount(id) {
    if (!confirm("Delete this account?")) return
    await supabase.from("target_accounts").update({ active:false }).eq("id", id)
    loadData()
  }

  const filtered = accounts.filter(a => filter === "all" || a.region === filter)
  const naAccounts = filtered.filter(a => a.region === "North America")
  const euAccounts = filtered.filter(a => a.region === "Europe")
  const totalTowerCo = filtered.reduce((s,a) => s + (a.revenue_towerco||0), 0)
  const totalOther = filtered.reduce((s,a) => s + (a.revenue_other||0), 0)
  const fmt = n => n >= 1000000 ? "$"+(n/1000000).toFixed(1)+"M" : n >= 1000 ? "$"+(n/1000).toFixed(0)+"K" : "$"+n

  function AccountTable({ accounts }) {
    if (accounts.length === 0) return <div style={{color:"#4a6080",fontSize:13,padding:"8px 0"}}>No accounts in this region.</div>
    return (
      <table>
        <thead><tr><th>Account</th><th>Segment</th><th>TowerCo Revenue</th><th>Other Revenue</th><th>Owner</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>
          {accounts.map(a => {
            const u = users.find(u => u.id === a.owner_id)
            return (
              <tr key={a.id}>
                <td style={{fontWeight:500,color:"#f1f5f9"}}>{a.name}</td>
                <td><span className={"badge "+(a.segment==="TowerCo"?"badge-blue":"badge-purple")}>{a.segment}</span></td>
                <td style={{color:"#10b981"}}>{a.revenue_towerco > 0 ? fmt(a.revenue_towerco) : "—"}</td>
                <td style={{color:"#4a90d9"}}>{a.revenue_other > 0 ? fmt(a.revenue_other) : "—"}</td>
                <td>{u ? u.full_name : "—"}</td>
                <td style={{fontSize:12,color:"#64748b",maxWidth:200}}>{a.notes || "—"}</td>
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
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <div><div className="page-title">Annual Priorities</div><div className="page-subtitle">Target accounts and revenue tracking</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Account</button>
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
          <option value="North America">North America</option>
          <option value="Europe">Europe</option>
        </select>
      </div>

      {(filter === "all" || filter === "North America") && (
        <div className="card">
          <div className="card-header"><div className="card-title">🌎 North America</div><span className="badge badge-blue">{naAccounts.length} accounts</span></div>
          <AccountTable accounts={naAccounts} />
        </div>
      )}
      {(filter === "all" || filter === "Europe") && (
        <div className="card">
          <div className="card-header"><div className="card-title">🌍 Europe</div><span className="badge badge-blue">{euAccounts.length} accounts</span></div>
          <AccountTable accounts={euAccounts} />
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing?"Edit Account":"Add Target Account"}</div>
            <div className="form-group"><label>Account Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Account name..." /></div>
            <div className="form-group"><label>Region</label>
              <select value={form.region} onChange={e=>setForm({...form,region:e.target.value})}>
                <option>North America</option><option>Europe</option>
              </select>
            </div>
            <div className="form-group"><label>Segment</label>
              <select value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})}>
                <option>TowerCo</option><option>Other</option>
              </select>
            </div>
            <div className="form-group"><label>TowerCo Revenue Target ($)</label><input type="number" value={form.revenue_towerco} onChange={e=>setForm({...form,revenue_towerco:e.target.value})} /></div>
            <div className="form-group"><label>Other Revenue Target ($)</label><input type="number" value={form.revenue_other} onChange={e=>setForm({...form,revenue_other:e.target.value})} /></div>
            <div className="form-group"><label>Owner</label>
              <select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})}>
                <option value="">No owner</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Notes / Importance</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Why is this account important..." /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing?"Save Changes":"Add Account"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
