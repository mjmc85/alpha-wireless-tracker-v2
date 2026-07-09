import { useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Forgot password state
  const [view, setView] = useState("login") // "login" | "forgot"
  const [forgotStep, setForgotStep] = useState(1) // 1=username, 2=question, 3=new password
  const [forgotUser, setForgotUser] = useState(null)
  const [forgotUsername, setForgotUsername] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [forgotMsg, setForgotMsg] = useState("")

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

  // --- Forgot Password flow ---
  async function findUser() {
    setForgotMsg("")
    const inputUser = forgotUsername.trim()
    if (!inputUser) {
      setForgotMsg("Please enter your username.")
      return
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, username, security_question, security_answer")
      .ilike("username", inputUser)
      .single()

    if (error || !data) {
      setForgotMsg("Username not found.")
      return
    }

    if (!data.security_question || !data.security_answer) {
      setForgotMsg("No security question set for this account. Please contact your team admin to reset your password.")
      return
    }

    setForgotUser(data)
    setForgotStep(2)
  }

  async function verifyAnswer() {
    setForgotMsg("")
    if (!securityAnswer.trim()) {
      setForgotMsg("Please enter your answer.")
      return
    }
    if (securityAnswer.trim().toLowerCase() === forgotUser.security_answer.toLowerCase()) {
      setForgotStep(3)
      setForgotMsg("")
    } else {
      setForgotMsg("Incorrect answer. Please try again.")
    }
  }

  async function resetPassword() {
    setForgotMsg("")
    if (!newPass || !confirmPass) {
      setForgotMsg("Please fill in both fields.")
      return
    }
    if (newPass !== confirmPass) {
      setForgotMsg("Passwords do not match.")
      return
    }
    if (newPass.length < 4) {
      setForgotMsg("Password must be at least 4 characters.")
      return
    }

    const { error } = await supabase
      .from("users")
      .update({ password: newPass })
      .eq("id", forgotUser.id)

    if (error) {
      setForgotMsg("Failed to reset password. Try again.")
      return
    }

    setForgotMsg("Password reset successfully! You can now log in.")
    resetForgotState()
    setView("login")
    setUsername(forgotUser.username)
    setPassword("")
  }

  function resetForgotState() {
    setForgotStep(1)
    setForgotUser(null)
    setForgotUsername("")
    setSecurityAnswer("")
    setNewPass("")
    setConfirmPass("")
    setForgotMsg("")
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:"16px", padding:"48px", width:"100%", maxWidth:"400px", textAlign:"center" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>📡</div>
        <h1 style={{ fontSize:"24px", fontWeight:"700", color:"#f1f5f9", marginBottom:"8px" }}>Alpha Wireless</h1>
        <p style={{ color:"#64748b", fontSize:"14px", marginBottom:"32px" }}>Priority Tracker v2</p>

        {view === "login" && (
          <>
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
            <button
              onClick={() => { setView("forgot"); resetForgotState() }}
              style={{ marginTop: 16, background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
            >
              Forgot password?
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: "#475569" }}>
              Admin? Leave username blank and use the master password.
            </div>
          </>
        )}

        {view === "forgot" && (
          <>
            {forgotStep === 1 && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>Forgot Password</div>
                <div style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Enter your username to reset your password.</div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Your username"
                    value={forgotUsername}
                    onChange={e => setForgotUsername(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && findUser()}
                  />
                </div>
                {forgotMsg && <div className="alert alert-error">{forgotMsg}</div>}
                <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px", marginTop: 8 }} onClick={findUser}>
                  Continue
                </button>
              </div>
            )}

            {forgotStep === 2 && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>Security Question</div>
                <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20, fontStyle: "italic" }}>
                  {forgotUser?.security_question}
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Your answer"
                    value={securityAnswer}
                    onChange={e => setSecurityAnswer(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && verifyAnswer()}
                  />
                </div>
                {forgotMsg && <div className="alert alert-error">{forgotMsg}</div>}
                <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px", marginTop: 8 }} onClick={verifyAnswer}>
                  Verify Answer
                </button>
              </div>
            )}

            {forgotStep === 3 && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>Set New Password</div>
                <div style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Choose a new password for your account.</div>
                <div className="form-group">
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    style={{ marginBottom: 12 }}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && resetPassword()}
                  />
                </div>
                {forgotMsg && <div className="alert alert-error">{forgotMsg}</div>}
                <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px", marginTop: 8 }} onClick={resetPassword}>
                  Reset Password
                </button>
              </div>
            )}

            <button
              onClick={() => { setView("login"); resetForgotState() }}
              style={{ marginTop: 16, background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}
            >
              ← Back to login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
