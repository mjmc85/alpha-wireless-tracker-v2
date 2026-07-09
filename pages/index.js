import { useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const inputUser = username.trim()
    const inputPass = password.trim()

    // --- Admin login (backwards compatible) ---
    if ((inputUser.toLowerCase() === "admin" || inputUser === "") && inputPass === "alpha2026") {
      localStorage.setItem("aw_auth", "true")
      localStorage.setItem("aw_user_id", "admin")
      localStorage.setItem("aw_user_name", "Admin")
      router.push("/dashboard")
      return
    }

    // --- Per-user login (case-insensitive) ---
    if (!inputUser) {
      setError("Please enter your username.")
      setLoading(false)
      return
    }

    // Use ilike for case-insensitive match
    const { data, error: queryError } = await supabase
      .from("users")
      .select("id, full_name, username, password")
      .ilike("username", inputUser)
      .single()

    if (queryError || !data) {
      setError("Username not found. Check with your team admin.")
      setLoading(false)
      return
    }

    if (data.password !== inputPass) {
      setError("Incorrect password. Please try again.")
      setLoading(false)
      return
    }

    // --- Success ---
    localStorage.setItem("aw_auth", "true")
    localStorage.setItem("aw_user_id", data.id)
    localStorage.setItem("aw_user_name", data.full_name)
    router.push("/dashboard")
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:"16px", padding:"48px", width:"100%", maxWidth:"400px", textAlign:"center" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>📡</div>
        <h1 style={{ fontSize:"24px", fontWeight:"700", color:"#f1f5f9", marginBottom:"8px" }}>Alpha Wireless</h1>
        <p style={{ color:"#64748b", fontSize:"14px", marginBottom:"32px" }}>Priority Tracker v2</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Username (or leave blank for admin)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ marginBottom: 12 }}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px", marginTop: 8 }} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div style={{ marginTop: 24, fontSize: 12, color: "#475569" }}>
          Admin? Leave username blank and use the master password.
        </div>
      </div>
    </div>
  )
}
