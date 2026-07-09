import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

// Returns the Monday of the given date as YYYY-MM-DD
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}

function formatWeekLabel(weekStart) {
  const d = new Date(weekStart + "T00:00:00")
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  const opts = { month: "short", day: "numeric" }
  return `${d.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}${end.getFullYear() !== d.getFullYear() ? ", " + end.getFullYear() : ""}`
}

export default function WeeklyCheckin() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [checkins, setCheckins] = useState([])
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("current") // "current" | "archive"
  const [selectedWeek, setSelectedWeek] = useState(null)

  const currentWeek = getWeekStart(new Date())

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: u }, { data: c }, { data: w }] = await Promise.all([
      supabase.from("users").select("*").order("full_name"),
      supabase.from("weekly_checkins").select("*").eq("week_start", currentWeek),
      supabase.from("weekly_checkins").select("week_start").order("week_start", { ascending: false }),
    ])
    setUsers(u || [])
    setCheckins(c || [])
    // unique weeks
    const seen = {}
    const uniqueWeeks = []
    for (const row of (w || [])) {
      if (!seen[row.week_start]) { seen[row.week_start] = true; uniqueWeeks.push(row.week_start) }
    }
    setWeeks(uniqueWeeks)
    setLoading(false)
  }

  async function loadWeek(weekStart) {
    const { data } = await supabase.from("weekly_checkins").select("*").eq("week_start", weekStart)
    setCheckins(data || [])
  }

  async function saveCheckin(userId, field, value) {
    const existing = checkins.find(c => c.user_id === userId)
    if (existing) {
      await supabase
        .from("weekly_checkins")
        .update({ [field]: value })
        .eq("id", existing.id)
      setCheckins(checkins.map(c => c.id === existing.id ? { ...c, [field]: value } : c))
    } else {
      const { data } = await supabase
        .from("weekly_checkins")
        .insert([{ week_start: currentWeek, user_id: userId, [field]: value }])
        .select("*")
        .single()
      if (data) setCheckins([...checkins, data])
      // refresh week list in case this is a new week entry
      if (!weeks.includes(currentWeek)) setWeeks([currentWeek, ...weeks])
    }
  }

  function getCheckinValue(userId, field) {
    const c = checkins.find(c => c.user_id === userId)
    return c ? (c[field] || "") : ""
  }

  const checkedInCount = checkins.filter(c => (c.commitments && c.commitments.trim()) || (c.stucks && c.stucks.trim())).length
  const isCurrent = view === "current" || (view === "archive" && selectedWeek === currentWeek)

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">📝 Weekly Check-in</div>
          <div className="page-subtitle">
            {view === "current"
              ? `Current week — ${formatWeekLabel(currentWeek)}`
              : `Archive — ${formatWeekLabel(selectedWeek)}`}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button
            className={view === "current" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => { setView("current"); setSelectedWeek(null); loadWeek(currentWeek) }}
          >
            📌 This Week
          </button>
          <button
            className={view === "archive" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => { setView("archive"); if (!selectedWeek) setSelectedWeek(weeks[0] || currentWeek); if (weeks[0]) loadWeek(weeks[0]) }}
          >
            🗄️ Archive
          </button>
        </div>
      </div>

      {view === "archive" && (
        <div className="card" style={{marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12}}>Select a week to view:</div>
          {weeks.length === 0 ? (
            <div style={{color:"#64748b",fontSize:13}}>No previous check-ins yet.</div>
          ) : (
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {weeks.map(w => (
                <button
                  key={w}
                  onClick={() => { setSelectedWeek(w); loadWeek(w) }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid " + (selectedWeek === w ? "#3b82f6" : "#334155"),
                    background: selectedWeek === w ? "rgba(59,130,246,0.15)" : "#0f172a",
                    color: selectedWeek === w ? "#93c5fd" : "#94a3b8",
                    fontSize: 13,
                    fontWeight: selectedWeek === w ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {formatWeekLabel(w)}{w === currentWeek ? " (current)" : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9"}}>
              {view === "current" ? "This Week's Check-in" : `Week of ${formatWeekLabel(selectedWeek)}`}
            </div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4}}>
              {isCurrent
                ? "Each person fills in their own row. Auto-saves when you click away."
                : "Viewing a past week (read-only)."}
            </div>
          </div>
          <div style={{fontSize:12,color:"#64748b"}}>
            {checkedInCount} / {users.length} checked in
          </div>
        </div>

        {users.length === 0 ? (
          <div style={{color:"#64748b",fontSize:13,padding:8}}>No team members found. Add users in Admin → Team.</div>
        ) : (
          <div>
            {/* Header row */}
            <div style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",gap:12,padding:"0 12px 8px 12px",borderBottom:"1px solid #334155",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px"}}>Team Member</div>
              <div style={{fontSize:11,fontWeight:600,color:"#10b981",textTransform:"uppercase",letterSpacing:"0.5px"}}>✅ Things to get done this week</div>
              <div style={{fontSize:11,fontWeight:600,color:"#ef4444",textTransform:"uppercase",letterSpacing:"0.5px"}}>🚫 Stucks for the week</div>
            </div>

            {users.map(u => {
              const hasContent = checkins.find(c => c.user_id === u.id && ((c.commitments && c.commitments.trim()) || (c.stucks && c.stucks.trim())))
              return (
                <div
                  key={u.id}
                  style={{
                    display:"grid",
                    gridTemplateColumns:"160px 1fr 1fr",
                    gap:12,
                    padding:"8px 12px",
                    borderRadius:8,
                    marginBottom:4,
                    background: hasContent ? "rgba(16,185,129,0.05)" : "#0f172a",
                    border: hasContent ? "1px solid rgba(16,185,129,0.2)" : "1px solid #334155",
                  }}
                >
                  <div style={{display:"flex",alignItems:"flex-start",gap:8,paddingTop:4}}>
                    <span style={{fontSize:16}}>👤</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9"}}>{u.full_name}</div>
                      {hasContent && <span style={{fontSize:10,color:"#10b981",fontWeight:600}}>✓ Done</span>}
                    </div>
                  </div>

                  {isCurrent ? (
                    <>
                      <textarea
                        value={getCheckinValue(u.id, "commitments")}
                        onChange={e => {
                          const existing = checkins.find(c => c.user_id === u.id)
                          if (existing) {
                            setCheckins(checkins.map(c => c.user_id === u.id ? { ...c, commitments: e.target.value } : c))
                          } else {
                            setCheckins([...checkins, { user_id: u.id, week_start: currentWeek, commitments: e.target.value, stucks: "" }])
                          }
                        }}
                        onBlur={e => saveCheckin(u.id, "commitments", e.target.value)}
                        placeholder="What you need to get done this week..."
                        style={{width:"100%",minHeight:70,padding:10,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:13,resize:"vertical",fontFamily:"inherit"}}
                      />
                      <textarea
                        value={getCheckinValue(u.id, "stucks")}
                        onChange={e => {
                          const existing = checkins.find(c => c.user_id === u.id)
                          if (existing) {
                            setCheckins(checkins.map(c => c.user_id === u.id ? { ...c, stucks: e.target.value } : c))
                          } else {
                            setCheckins([...checkins, { user_id: u.id, week_start: currentWeek, commitments: "", stucks: e.target.value }])
                          }
                        }}
                        onBlur={e => saveCheckin(u.id, "stucks", e.target.value)}
                        placeholder="What's blocking you this week..."
                        style={{width:"100%",minHeight:70,padding:10,borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#f1f5f9",fontSize:13,resize:"vertical",fontFamily:"inherit"}}
                      />
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:13,color:"#cbd5e1",whiteSpace:"pre-wrap",padding:10,minHeight:70,background:"#0f172a",borderRadius:8,border:"1px solid #334155"}}>
                        {getCheckinValue(u.id, "commitments") || <span style={{color:"#475569"}}>—</span>}
                      </div>
                      <div style={{fontSize:13,color:"#cbd5e1",whiteSpace:"pre-wrap",padding:10,minHeight:70,background:"#0f172a",borderRadius:8,border:"1px solid #334155"}}>
                        {getCheckinValue(u.id, "stucks") || <span style={{color:"#475569"}}>—</span>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
