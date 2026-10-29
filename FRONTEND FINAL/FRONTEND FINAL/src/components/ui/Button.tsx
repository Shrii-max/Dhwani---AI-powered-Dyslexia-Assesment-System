import type { ReactNode } from "react"

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      className={`btn ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
