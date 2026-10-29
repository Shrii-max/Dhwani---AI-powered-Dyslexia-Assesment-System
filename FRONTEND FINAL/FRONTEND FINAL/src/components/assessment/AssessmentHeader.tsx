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
          Item 1 of 5 <b>20% complete</b>
        </span>
        <div className="progress">
          <i style={{ width: "20%" }} />
        </div>
      </div>
      <Button variant="secondary">
        <Pause size={17} /> Save & pause
      </Button>
      <Link to="/assessments" className="exit-link">
        <LogOut size={17} /> Exit
      </Link>
    </header>
  )
}
