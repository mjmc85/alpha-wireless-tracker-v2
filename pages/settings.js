import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Layout from "../components/Layout"
import { supabase } from "../lib/supabase"

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was the name of your first school?",
  "What is your favorite food?",
]

export default function Settings() {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Password change
  const [currentPass, setCurrentPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [passMsg, setPassMsg] = useState("")
  const [passMsgType, setPassMsgType] = useState("")

  // Security question
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [secMsg, setSecMsg] = useState("")
  const [secMsgType, setSecMsgType] = useState("")

  useEffect(() => {
    if (!localStorage.getItem("aw_auth")) { router.push("/"); return }
    const id = localStorage.getItem("aw_user_id")
    const name = localStorage.getItem("aw_user_name")
    setUserId(id)
    setUserName(name)
    if (id === "admin") {
      setIsAdmin(true)
      setLoading(false)
    } else {
      loadUserData(id)
    }
  }, [])

  async function loadUserData(id) {
    const { data } = await supabase
      .from("users")
      .select("password, security_question, security_answer")
      .eq("id", id)
      .single()
    if (data) {
      setSecurityQuestion(data.security_question || "")
      setSecurityAnswer(data.security_answer || "")
    }
    setLoading(false)
  }

  async function changePassword() {
    setPassMsg("")
    setPassMsgType("")

    if (!newPass || !confirmPass) {
      setPassMsg("Please fill in all password fields.")
      setPassMsgType("error")
      return
    }
    if (newPass !== confirmPass) {
      setPassMsg("New passwords do not match.")
      setPassMsgType("error")
      return
    }
    if (newPass.length < 4) {
      setPassMsg("Password must be at least 4 characters.")
      setPassMsgType("error")
      return
    }

    // Verify current password
    const { data } = await supabase
      .from("users")
      .select("password")
      .eq("id", userId)
      .single()

    if (!data || data.password !== currentPass) {
      setPassMsg("Current password is incorrect.")
      setPassMsgType("error")
      return
    }

    // Update password
    const { error } = await supabase
      .from("users")
      .update({ password: newPass })
      .eq("id", userId)

    if (error) {
      setPassMsg("Failed to update password. Try again.")
      setPassMsgType("error")
    } else {
      setPassMsg("Password updated successfully!")
      setPassMsgType("success")
      setCurrentPass("")
      setNewPass("")
      setConfirmPass("")
      window.dispatchEvent(new CustomEvent("showToast", { detail: { type: "success", message: "Password changed!" } }))
    }
  }

  async function saveSecurityQuestion() {
    setSecMsg("")
    setSecMsgType("")

    if (!securityQuestion || !securityAnswer.trim()) {
      setSecMsg("Please select a question and enter an answer.")
      setSecMsgType("error")
      return
    }

    const { error } = await supabase
      .from("users")
      .update({
        security_question: securityQuestion,
        security_answer: securityAnswer.trim().toLowerCase(),
      })
      .eq("id", userId)

    if (error) {
      setSecMsg("Failed to save. Try again.")
      setSecMsgType("error")
    } else {
      setSecMsg("Security question saved!")
      setSecMsgType("success")
      window.dispatchEvent(new CustomEvent("showToast", { detail: { type: "success", message: "Security question saved!" } }))
    }
  }

  if (loading) return <Layout><div style={{color:"#64748b",padding:40}}>Loading...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Settings</div>
          <div className="page-subtitle">Manage your account</div>
        </div>
      </div>

      {isAdmin ? (
        <div className="card" style={{maxWidth:600}}>
          <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:12}}>👤 Admin Account</div>
          <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.6}}>
            You are logged in as <strong style={{color:"#f1f5f9"}}>Admin</strong> using the master password.
            <br /><br />
            The admin password is set in the code and cannot be changed here.
            <br /><br />
            To manage team member passwords and security questions, go to <span style={{color:"#3b82f6",cursor:"pointer"}} onClick={() => router.push("/users")}>Admin → Team</span>.
          </div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,maxWidth:1000}}>
          {/* Change Password */}
          <div className="card">
            <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:16}}>🔐 Change Password</div>

            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={e => e.key === "Enter" && changePassword()}
              />
            </div>

            {passMsg && (
              <div className={"alert alert-" + passMsgType} style={{marginBottom:12}}>{passMsg}</div>
            )}

            <button className="btn btn-primary" onClick={changePassword}>Update Password</button>
          </div>

          {/* Security Question */}
          <div className="card">
            <div style={{fontSize:14,fontWeight:600,color:"#f1f5f9",marginBottom:4}}>🔒 Security Question</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>Used to reset your password if you forget it.</div>

            <div className="form-group">
              <label>Question</label>
              <select
                value={securityQuestion}
                onChange={e => setSecurityQuestion(e.target.value)}
              >
                <option value="">Select a security question...</option>
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Answer</label>
              <input
                type="text"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                placeholder="Enter your answer"
                onKeyDown={e => e.key === "Enter" && saveSecurityQuestion()}
              />
            </div>

            {secMsg && (
              <div className={"alert alert-" + secMsgType} style={{marginBottom:12}}>{secMsg}</div>
            )}

            <button className="btn btn-primary" onClick={saveSecurityQuestion}>Save Security Question</button>
          </div>
        </div>
      )}
    </Layout>
  )
}
