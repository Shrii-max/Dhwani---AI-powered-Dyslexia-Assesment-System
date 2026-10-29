import { AudioLines } from "lucide-react"
import { Link } from "react-router-dom"

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">
        <AudioLines size={22} />
      </span>
      <span>
        <b>Dhwani</b>
        <small>Dyslexia Screening</small>
      </span>
    </Link>
  )
}
