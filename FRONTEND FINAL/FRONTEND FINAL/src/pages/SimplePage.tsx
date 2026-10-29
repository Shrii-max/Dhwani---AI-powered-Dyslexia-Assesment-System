import { ArrowRight, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"

export function SimplePage({ type }: { type: string }) {
  const data: Record<string, [string, string]> = {
    learning: [
      "Personalized learning plan",
      "A calm weekly plan based on verified screening observations.",
    ],
    practice: [
      "Practice activities",
      "Short, supportive activities for sound and word confidence.",
    ],
    progress: [
      "Progress tracking",
      "See growth over time without rankings or pressure.",
    ],
    profile: [
      "Profile & settings",
      "Manage accessibility, privacy, consent, and audio preferences.",
    ],
    students: [
      "Student list",
      "View learners, screening status, and pending reviews.",
    ],
    review: [
      "Audio response review",
      "Compare original audio, model output, and assessor corrections.",
    ],
    report: [
      "Final assessment report",
      "Prepare a verified, non-diagnostic educational summary.",
    ],
  }
  const [title, desc] = data[type] || [
    "Assessor dashboard",
    "Review responses and support each learner’s next steps.",
  ]
  return (
    <AppShell>
      <div className="page">
        <div className="page-title">
          <span className="eyebrow">
            {type === "dashboard" ? "Assessor workspace" : "Dhwani"}
          </span>
          <h1>{title}</h1>
          <p>{desc}</p>
        </div>
        <div className="empty-state">
          <Sparkles />
          <h2>This workspace is ready</h2>
          <p>
            Core navigation and data states are connected for the prototype.
          </p>
          <Link
            className="btn primary"
            to={type === "dashboard" ? "/assessor/students" : "/dashboard"}
          >
            {type === "dashboard" ? "View students" : "Back to dashboard"}
            <ArrowRight />
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
