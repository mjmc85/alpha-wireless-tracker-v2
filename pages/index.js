import { useState } from "react"
import { useRouter } from "next/router"

export default function Login() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === "alpha2026") {
      localStorage.setItem("aw_auth", "true")
      router.push("/dashboard")
    } else {
      setError("Incorrect password. Please try again.")
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:"16px", padding:"48px", width:"100%", maxWidth:"400px", textAlign:"center" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>📡</div>
        <h1 style={{ fontSize:"24px", fontWeight:"700", color:"#f1f5f9", marginBottom:"8px" }}>Alpha Wireless</h1>
        <p style={{ color:"#64748b", fontSize:"14px", marginBottom:"32px" }}>Priority Tracker v2</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px" }}>Sign In</button>
        </form>
      </div>
    </div>
  )
}
