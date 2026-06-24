import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { token } = req.query
  const { data: tokens } = await supabase.from("api_tokens").select("token").eq("active", true)
  const valid = (tokens||[]).some(t => t.token === token)
  if (!valid) return res.status(401).json({ error: "Invalid or missing token. Use ?token=your-token" })

  const [{ data: priorities }, { data: actions }, { data: quarters }] = await Promise.all([
    supabase.from("priorities").select("*"),
    supabase.from("action_items").select("*"),
    supabase.from("quarters").select("*").eq("status", "Active"),
  ])

  const today = new Date(); today.setHours(0,0,0,0)
  const overdue = (actions||[]).filter(a => a.due_date && new Date(a.due_date) < today && a.status !== "Complete")
  const complete = (actions||[]).filter(a => a.status === "Complete")
  const blocked = (actions||[]).filter(a => a.status === "Blocked")

  res.status(200).json({
    generated_at: new Date().toISOString(),
    quarter: quarters?.[0]?.title || "Unknown",
    summary: {
      total_priorities: (priorities||[]).length,
      priorities_complete: (priorities||[]).filter(p=>p.status==="Complete").length,
      priorities_in_progress: (priorities||[]).filter(p=>p.status==="In Progress").length,
      priorities_blocked: (priorities||[]).filter(p=>p.status==="Blocked").length,
      avg_completion: (priorities||[]).length ? Math.round((priorities||[]).reduce((s,p)=>s+(p.overall_completion||0),0)/(priorities||[]).length) : 0,
      total_actions: (actions||[]).length,
      actions_complete: complete.length,
      actions_overdue: overdue.length,
      actions_blocked: blocked.length,
    },
    priorities: (priorities||[]).map(p => ({
      number: p.priority_number,
      title: p.title,
      status: p.status,
      completion: p.overall_completion || 0,
      overdue_actions: overdue.filter(a=>a.priority_id===p.id).length,
    })),
    overdue_actions: overdue.map(a => ({ description:a.description, owner:a.owner_name, due_date:a.due_date, priority_id:a.priority_id })),
  })
}
