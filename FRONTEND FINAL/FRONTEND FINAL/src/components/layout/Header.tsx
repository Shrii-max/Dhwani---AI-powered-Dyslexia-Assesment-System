import {
  BarChart3,
  CircleUserRound,
  Home,
  ListChecks,
  Sparkles,
} from "lucide-react"
import { Link, NavLink } from "react-router-dom"
import { Logo } from "./Logo"

const navigation = [
  ["/", "Home", Home],
  ["/assessments", "Assessments", ListChecks],
  ["/results", "Results", BarChart3],
  ["/learning", "Learning plan", Sparkles],
] as const

export function Header() {
  return (
    <header className="topbar">
      <Logo />
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="header-actions">
        <Link to="/profile" className="icon-button" aria-label="Profile">
          <CircleUserRound size={21} />
        </Link>
      </div>
    </header>
  )
}
