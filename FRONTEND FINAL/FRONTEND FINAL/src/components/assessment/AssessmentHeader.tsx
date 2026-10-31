import { LogOut, Pause } from "lucide-react"
import { Link } from "react-router-dom"
import type { AssessmentTest } from "../../types/assessment"
import { Logo } from "../layout/Logo"
import { Button } from "../ui/Button"

export function AssessmentHeader({ test }: { test: AssessmentTest }) {
  return (
    <header className="assessment-header">
      <Logo />
      <div className="assessment-name">
        <span>{test.category}</span>
        <b>
          Test {test.id}: {test.title}
        </b>
      </div>
      <div className="assessment-progress">
        <span>
          Screening Item <b>Untimed Session</b>
        </span>
        <div className="progress">
          <i style={{ width: "100%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Button variant="secondary" className="small">
          <Pause size={15} /> Save &amp; pause
        </Button>
        <Link to="/assessments" className="exit-link">
          <LogOut size={16} /> Exit
        </Link>
      </div>
    </header>
  )
}
