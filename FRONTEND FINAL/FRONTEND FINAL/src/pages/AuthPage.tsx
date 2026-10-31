import { useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Logo } from "../components/layout/Logo"
import { authAPI } from "../services/api"

export function AuthPage({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Target destination after successful auth (e.g. redirected from /assessments)
  const from = (location.state as any)?.from?.pathname || "/dashboard"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const copy =
    mode === "login"
      ? ["Welcome back", "Sign in to access your screening history and learning plan"]
      : mode === "signup"
        ? ["Create learner profile", "Start a private, supportive dyslexia screening journey"]
        : ["Reset your password", "We'll send a secure password reset link to your email"]

  // Client-side validation helper
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (mode === "signup") {
      const trimmedName = name.trim()
      if (!trimmedName) {
        errors.name = "Full name is required"
      } else if (trimmedName.length < 2) {
        errors.name = "Full name must be at least 2 characters long"
      } else if (trimmedName.length > 100) {
        errors.name = "Full name cannot exceed 100 characters"
      }
    }

    const trimmedEmail = email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail) {
      errors.email = "Email address is required"
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com)"
    }

    if (mode !== "forgot") {
      if (!password) {
        errors.password = "Password is required"
      } else if (mode === "signup" && password.length < 8) {
        errors.password = "Password must be at least 8 characters long"
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    // Pre-validate on client
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (mode === "signup") {
        await authAPI.signup({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        })
        navigate(from, { replace: true })
      } else if (mode === "login") {
        await authAPI.login(email.trim().toLowerCase(), password)
        navigate(from, { replace: true })
      } else {
        setSuccessMsg(
          "If an account exists for this email, password reset instructions have been sent."
        )
      }
    } catch (err: any) {
      // Map server-side validation errors to inline fields if available
      if (err?.validationErrors && typeof err.validationErrors === "object") {
        setFieldErrors(err.validationErrors)
      }
      setError(
        err?.message || "Authentication failed. Please check your details."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Brand & Mission Aside */}
      <div className="auth-aside">
        <Logo />
        <div style={{ margin: "auto 0" }}>
          <span className="eyebrow">
            <Sparkles size={14} /> Dhwani Screening Suite
          </span>
          <h1>
            Every Mind.
            <br />
            Differently Wired.
          </h1>
          <p>
            Evidence-based phonological assessment and personalized multi-sensory practice,
            designed to empower every child's reading journey.
          </p>
        </div>
        <span className="privacy-note">
          <ShieldCheck size={20} style={{ color: "var(--teal)", flexShrink: 0 }} />
          <span>
            Children's voice recordings and data are securely protected and strictly private.
          </span>
        </span>
      </div>

      {/* Main Form Container */}
      <div className="auth-main">
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div>
            <h2>{copy[0]}</h2>
            <p className="auth-sub">{copy[1]}</p>
          </div>

          {/* Global Alert Banner */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0.85rem 1.1rem",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 92, 119, 0.12)",
                border: "1px solid rgba(255, 92, 119, 0.35)",
                color: "var(--danger)",
                fontSize: "0.92rem",
                lineHeight: 1.4,
              }}
              role="alert"
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0.85rem 1.1rem",
                borderRadius: "12px",
                backgroundColor: "rgba(43, 212, 190, 0.12)",
                border: "1px solid rgba(43, 212, 190, 0.35)",
                color: "var(--teal)",
                fontSize: "0.92rem",
                lineHeight: 1.4,
              }}
              role="status"
            >
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Full Name Field (Signup only) */}
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-name" className="auth-label">
                <span>Full Name</span>
                <span style={{ fontSize: "0.78rem", color: "var(--mut)" }}>
                  Parent or Learner
                </span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: "" }))
                    }
                  }}
                  placeholder="e.g. Shrinema Sharma"
                  className={`auth-input ${fieldErrors.name ? "has-error" : ""}`}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
              </div>
              {fieldErrors.name && (
                <span id="name-error" className="auth-inline-error">
                  <AlertCircle size={14} /> {fieldErrors.name}
                </span>
              )}
            </div>
          )}

          {/* Email Address Field */}
          <div className="auth-field">
            <label htmlFor="auth-email" className="auth-label">
              <span>Email Address</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: "" }))
                  }
                }}
                placeholder="name@example.com"
                className={`auth-input ${fieldErrors.email ? "has-error" : ""}`}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
            </div>
            {fieldErrors.email && (
              <span id="email-error" className="auth-inline-error">
                <AlertCircle size={14} /> {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password Field (Signup and Login) */}
          {mode !== "forgot" && (
            <div className="auth-field">
              <div className="auth-label">
                <label htmlFor="auth-password">Password</label>
                {mode === "signup" && (
                  <span style={{ fontSize: "0.78rem", color: "var(--mut)" }}>
                    Min. 8 characters
                  </span>
                )}
              </div>
              <div className="auth-input-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: "" }))
                    }
                  }}
                  placeholder={
                    mode === "signup"
                      ? "Create a secure password"
                      : "Enter your password"
                  }
                  className={`auth-input with-toggle ${fieldErrors.password ? "has-error" : ""}`}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span id="password-error" className="auth-inline-error">
                  <AlertCircle size={14} /> {fieldErrors.password}
                </span>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={19} />
                <span>Processing...</span>
              </>
            ) : mode === "login" ? (
              <>
                <span>Sign in</span>
                <ArrowRight size={18} />
              </>
            ) : mode === "signup" ? (
              <>
                <span>Create Account</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Alternate Navigation Links */}
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <Link
                  to="/forgot-password"
                  style={{ color: "var(--mut)", fontSize: "0.88rem" }}
                >
                  Forgot password?
                </Link>
                <span>
                  New to Dhwani?{" "}
                  <Link to="/signup">
                    Create account
                  </Link>
                </span>
              </>
            ) : mode === "signup" ? (
              <div style={{ width: "100%", textAlign: "center" }}>
                <span>
                  Already have an account?{" "}
                  <Link to="/login">
                    Sign in &rarr;
                  </Link>
                </span>
              </div>
            ) : (
              <div style={{ width: "100%", textAlign: "center" }}>
                <Link to="/login">
                  &larr; Back to sign in
                </Link>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
