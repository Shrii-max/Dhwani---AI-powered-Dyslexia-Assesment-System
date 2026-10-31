import { useEffect, useState } from "react"
import {
  BarChart3,
  CircleUserRound,
  Home,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Sparkles,
} from "lucide-react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Logo } from "./Logo"

const navigation = [
  ["/", "Home", Home],
  ["/assessments", "Assessments", ListChecks],
  ["/results", "Results", BarChart3],
  ["/learning", "Learning Plan", Sparkles],
  ["/dashboard", "Dashboard", LayoutDashboard],
] as const

export function Header() {
  const [token, setToken] = useState<string | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setToken(localStorage.getItem("dhwani_token"))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("dhwani_token")
    setToken(null)
    setShowProfileMenu(false)
    navigate("/login")
  }

  return (
    <header className="dh-nav-global">
      <Logo />

      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="header-actions">
        {token ? (
          <div className="profile-container" style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="icon-button"
              aria-label="Profile and settings"
              title="Profile menu"
            >
              <CircleUserRound size={20} />
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown glass-card">
                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="dropdown-item"
                >
                  <CircleUserRound size={16} />
                  <span>Profile &amp; Settings</span>
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setShowProfileMenu(false)}
                  className="dropdown-item"
                >
                  <LayoutDashboard size={16} />
                  <span>Learner Dashboard</span>
                </Link>
                <div className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-item danger">
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link to="/login" className="dh-btn ghost small">
              <LogIn size={15} style={{ marginRight: "6px" }} />
              Sign in
            </Link>
            <Link to="/signup" className="dh-btn primary small">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
