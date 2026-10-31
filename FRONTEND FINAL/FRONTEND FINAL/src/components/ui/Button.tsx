import type { CSSProperties, ReactNode } from "react"

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled,
  className = "",
  type = "button",
  style,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: "button" | "submit"
  style?: CSSProperties
}) {
  return (
    <button
      type={type}
      className={`btn ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  )
}
