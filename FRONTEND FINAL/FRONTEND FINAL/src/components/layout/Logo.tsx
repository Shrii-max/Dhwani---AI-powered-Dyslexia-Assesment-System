import { Link } from "react-router-dom"

export function Logo() {
  return (
    <Link to="/" className="dh-logo">
      <i aria-hidden="true" />
      <span>
        <b>Dhwani</b>
        <small>AI Dyslexia Screening</small>
      </span>
    </Link>
  )
}
