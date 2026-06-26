import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

export default function Calendar() {
  const router = useRouter()
  const [actionItems, setActionItems] = useState([])
  const [priorities, setPriorities] = useState([])
  const [users, setUsers] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: a }, { data: p }, { data: u }] = await Promise.all([
      supabase.from("action_items").select("*").order("due_date"),
      supabase.from("priorities").select("*"),
      supabase.from("users").select("*"),
    ])
    setActionItems(a || [])
    setPriorities(p || [])
    setUsers(u || [])
    setLoading(false)
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay()
  }

  function getItemsForDate(dateStr) {
    return actionItems.filter(a => a.due_date === dateStr)
  }

  function getPriority(priorityId) {
    return priorities.find(p => p.id === priorityId)
  }

  function getOwner(ownerId) {
    return users.find(u => u.id === ownerId)
  }

  function formatDate(year, month, day) {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date().toISOString().split("T")[0]

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Build calendar grid
  const calendarDays = []
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null) // Empty cells before first day
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Get items for selected date
  const selectedDateStr = selectedDate ? formatDate(year, month, selectedDate) : null
  const selectedItems = selectedDateStr ? getItemsForDate(selectedDateStr) : []

  // Count items this month
  const monthStart = formatDate(year, month, 1)
  const monthEnd = formatDate(year, month, daysInMonth)
  const itemsThisMonth = actionItems.filter(a => a.due_date >= monthStart && a.due_date <= monthEnd)

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading calendar...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">📅 Calendar</div>
          <div className="page-subtitle">{itemsThisMonth.length} action item{itemsThisMonth.length !== 1 ? "s" : ""} due this month</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 350px",gap:24}}>
        {/* Calendar Grid */}
        <div className="card">
          {/* Month Navigation */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <button className="btn btn-secondary" onClick={prevMonth}>← Prev</button>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <span style={{fontSize:20,fontWeight:600,color:"#f1f5f9"}}>{monthNames[month]} {year}</span>
              <button className="btn btn-secondary btn-sm" onClick={goToToday}>Today</button>
            </div>
            <button className="btn btn-secondary" onClick={nextMonth}>Next →</button>
          </div>

          {/* Day Headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7, 1fr)",gap:4,marginBottom:8}}>
            {dayNames.map(day => (
              <div key={day} style={{textAlign:"center",padding:"8px 0",color:"#64748b",fontSize:12,fontWeight:600}}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7, 1fr)",gap:4}}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={index} style={{height:100,background:"transparent"}}></div>
              }
              const dateStr = formatDate(year, month, day)
              const items = getItemsForDate(dateStr)
              const isToday = dateStr === today
              const isSelected = selectedDate === day
              const hasOverdue = items.some(a => a.status !== "Complete" && dateStr < today)

              return (
                <div 
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  style={{
                    height: 100,
                    background: isSelected ? "#1e40af" : isToday ? "#1e293b" : "#0f172a",
                    border: isToday ? "2px solid #3b82f6" : "1px solid #334155",
                    borderRadius: 8,
                    padding: 8,
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4
                  }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#3b82f6" : "#f1f5f9"
                    }}>{day}</span>
                    {items.length > 0 && (
                      <span style={{
                        background: hasOverdue ? "#ef4444" : "#3b82f6",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 10
                      }}>{items.length}</span>
                    )}
                  </div>
                  {items.length > 0 && (
                    <div style={{fontSize:11,color:"#94a3b8",overflow:"hidden"}}>
                      {items.slice(0,2).map((item, i) => (
                        <div key={i} style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: item.status === "Complete" ? "#64748b" : hasOverdue ? "#fca5a5" : "#94a3b8"
                        }}>
                          {item.description.substring(0, 15)}{item.description.length > 15 ? "..." : ""}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <div style={{color:"#64748b"}}>+{items.length - 2} more</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div>
          <div className="card" style={{position:"sticky",top:80}}>
            <div style={{fontSize:16,fontWeight:600,color:"#f1f5f9",marginBottom:16}}>
              {selectedDate 
                ? `${monthNames[month]} ${selectedDate}, ${year}` 
                : "Select a day to view items"}
            </div>

            {!selectedDate && (
              <div style={{color:"#64748b",fontSize:14}}>
                Click on a day in the calendar to see all action items due that day.
              </div>
            )}

            {selectedDate && selectedItems.length === 0 && (
              <div style={{color:"#64748b",fontSize:14}}>
                No action items due on this day.
              </div>
            )}

            {selectedItems.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {selectedItems.map(item => {
                  const priority = getPriority(item.priority_id)
                  const owner = getOwner(item.owner_id)
                  const isOverdue = item.status !== "Complete" && selectedDateStr < today
                  const isComplete = item.status === "Complete"

                  return (
                    <div 
                      key={item.id}
                      style={{
                        background: isOverdue ? "rgba(239,68,68,0.1)" : isComplete ? "rgba(16,185,129,0.1)" : "#1e293b",
                        border: isOverdue ? "1px solid #ef4444" : isComplete ? "1px solid #10b981" : "1px solid #334155",
                        borderRadius: 8,
                        padding: 12
                      }}
                    >
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <span style={{
                          fontWeight: 500,
                          color: isComplete ? "#64748b" : "#f1f5f9",
                          textDecoration: isComplete ? "line-through" : "none"
                        }}>
                          {item.description}
                        </span>
                        <span style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: isComplete ? "#10b981" : isOverdue ? "#ef4444" : "#3b82f6",
                          color: "#fff"
                        }}>
                          {item.status}
                        </span>
                      </div>
                      {priority && (
                        <div style={{fontSize:12,color:"#4a90d9",marginBottom:4,cursor:"pointer"}} onClick={() => router.push("/priority/" + priority.id)}>
                          📋 {priority.title}
                        </div>
                      )}
                      {owner && (
                        <div style={{fontSize:12,color:"#64748b"}}>
                          👤 {owner.full_name}
                        </div>
                      )}
                      <div style={{fontSize:12,color:"#64748b",marginTop:4}}>
                        Progress: {item.completion_percentage || 0}%
                      </div>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{marginTop:8,width:"100%"}}
                        onClick={() => router.push("/priority/" + item.priority_id)}
                      >
                        View Priority
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
