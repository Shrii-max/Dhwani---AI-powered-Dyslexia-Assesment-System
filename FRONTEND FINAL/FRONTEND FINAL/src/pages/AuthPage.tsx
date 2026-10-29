import { useState } from "react"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Logo } from "../components/layout/Logo"
import { Button } from "../components/ui/Button"
import { authAPI } from "../services/api"

export function AuthPage({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const copy =
    mode === "login"
      ? ["Welcome back", "Sign in to continue your learning journey"]
      : mode === "signup"
        ? ["Create your account", "Start a supported learning journey"]
        : ["Reset your password", "We’ll send a secure reset link"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (mode === "signup") {
        await authAPI.signup({
          name: name.trim(),
          email: email.trim(),
          password
        })
        navigate("/dashboard")
      } else if (mode === "login") {
        await authAPI.login(email.trim(), password)
        navigate("/dashboard")
      } else {
        setSuccessMsg("If an account exists for this email, password reset instructions have been sent.")
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please check your details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Logo />
        <div>
          <span className="eyebrow">Dhwani assessment suite</span>
          <h1>
            Small steps.
            <br />
            Clearer pathways.
          </h1>
          <p>
            Thoughtful screening and personalized practice, built around every
            learner.
          </p>
        </div>
        <span className="privacy-note">
          <ShieldCheck size={18} /> Children’s audio stays private and requires
          consent.
        </span>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>{copy[0]}</h2>
        <p>{copy[1]}</p>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#dc2626",
              fontSize: "0.9rem",
              marginBottom: "1rem"
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#16a34a",
              fontSize: "0.9rem",
              marginBottom: "1rem"
            }}
          >
            {successMsg}
          </div>
        )}

        {mode === "signup" && (
          <label>
            Full name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
        )}
        <label>
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </label>
        {mode !== "forgot" && (
          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
            />
          </label>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Processing...
            </>
          ) : mode === "login" ? (
            <>Sign in <ArrowRight size={18} /></>
          ) : mode === "signup" ? (
            <>Create account <ArrowRight size={18} /></>
          ) : (
            <>Send reset link <ArrowRight size={18} /></>
          )}
        </Button>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link to="/forgot-password">Forgot password?</Link>
              <span>
                New here? <Link to="/signup">Create an account</Link>
              </span>
            </>
          ) : (
            <Link to="/login">Back to sign in</Link>
          )}
        </div>
      </form>
    </div>
  )
}
