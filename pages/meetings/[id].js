import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../../components/Layout"
import { supabase } from "../../lib/supabase"

const SECTIONS = [
  { key:"good_news", label:"🎉 Good News", color:"#10b981", placeholder:"Share a win or positive update..." },
  { key:"metrics", label:"📊 Metrics Review", color:"#4a90d9", placeholder:"Key metrics to review..." },
  { key:"top_thing", label:"📌 #1 Thing Today", color:"#f59e0b", placeholder:"The most important thing to get done today..." },
  { key:"stucks", label:"🚧 Stucks / Blockers", color:"#ef4444", placeholder:"What is blocking progress?" },
  { key:"actions", label:"✅ Action Items", color:"#8b5cf6", placeholder:"Action item updates..." },
]

export default function MeetingDetail() {
  const router = useRouter()
  const { id } = router.query
  const [meeting, setMeeting] = useState(null)
  const [quarter, setQuarter] = useState(null)
  const [agendaItems, setAgendaItems] = useState([])
  const [newContent, setNewContent] = useState({})
  const [newAuthor, setNewAuthor] = useState({})

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    if (id) loadData()
  }, [id])

  async function loadData() {
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from("meetings").select("*").eq("id", id).single(),
      supabase.from("meeting_agenda_items").select("*").eq("meeting_id", id).order("created_at"),
    ])
    setMeeting(m)
    setAgendaItems(a || [])
    if (m?.quarter_id) {
      const { data: q } = await supabase.from("quarters").select("*").eq("id", m.quarter_id).single()
      setQuarter(q)
    }
  }

  async function addItem(section) {
    const content = newContent[section]
    if (!content?.trim()) return
    await supabase.from("meeting_agenda_items").insert([{ meeting_id:id, section, content, author:newAuthor[section]||null }])
    setNewContent({...newContent,[section]:""})
    loadData()
  }

  async function deleteItem(itemId) {
    await supabase.from("meeting_agenda_items").delete().eq("id", itemId)
    loadData()
  }

  if (!meeting) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" style={{marginBottom:12}} onClick={() => router.push("/meetings")}>← Back to Meetings</button>
          <div className="page-title">{meeting.title}</div>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <span className="badge badge-blue">{meeting.meeting_date}</span>
            {meeting.meeting_time && <span className="badge badge-gray">{meeting.meeting_time}</span>}
            {quarter && <span className="badge badge-blue">{quarter.title}</span>}
          </div>
        </div>
        {meeting.teams_link && (
          <a href={meeting.teams_link} target="_blank" rel="noreferrer" className="btn btn-primary">🔗 Join Teams Call</a>
        )}
      </div>

      {meeting.notes && (
        <div className="card" style={{marginBottom:20}}>
          <div style={{fontSize:13,color:"#94a3b8"}}>{meeting.notes}</div>
        </div>
      )}

      {SECTIONS.map(sec => {
        const items = agendaItems.filter(a => a.section === sec.key)
        return (
          <div key={sec.key} className="card" style={{marginBottom:16}}>
            <div className="card-header">
              <div className="card-title" style={{color:sec.color}}>{sec.label}</div>
              <span className="badge badge-gray">{items.length}</span>
            </div>
            {items.length > 0 && (
              <div style={{marginBottom:16}}>
                {items.map(item => (
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid #0f2847"}}>
                    <div>
                      <div style={{fontSize:13,color:"#e2e8f0"}}>{item.content}</div>
                      {item.author && <div style={{fontSize:11,color:"#64748b",marginTop:4}}>— {item.author}</div>}
                    </div>
                    <button className="btn btn-danger btn-sm" style={{marginLeft:12}} onClick={() => deleteItem(item.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8"}}>
              <input
                value={newContent[sec.key]||""}
                onChange={e=>setNewContent({...newContent,[sec.key]:e.target.value})}
                onKeyDown={e=>e.key==="Enter"&&addItem(sec.key)}
                placeholder={sec.placeholder}
                style={{flex:1}}
              />
              <input
                value={newAuthor[sec.key]||""}
                onChange={e=>setNewAuthor({...newAuthor,[sec.key]:e.target.value})}
                placeholder="Your name"
                style={{width:140}}
              />
              <button className="btn btn-primary btn-sm" onClick={()=>addItem(sec.key)}>Add</button>
            </div>
          </div>
        )
      })}
    </Layout>
  )
}
