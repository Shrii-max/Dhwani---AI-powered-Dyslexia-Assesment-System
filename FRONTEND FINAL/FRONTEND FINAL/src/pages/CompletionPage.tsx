import { Check } from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"

export function CompletionPage() {
  return (
    <AppShell>
      <div className="completion">
        <span>
          <Check />
        </span>
        <h1>Assessment complete</h1>
        <p>
          You showed focus and courage. Your responses are saved and ready for
          an assessor to review.
        </p>
        <div>
          <Link className="btn primary" to="/results">
            View summary
          </Link>
          <Link className="btn secondary" to="/dashboard">
            Return home
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
