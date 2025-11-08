import React from "react"

interface ConsoleButtonProps {
  children: React.ReactNode
  variant?: "console_key" | "outlined"
  onClick?: () => void
  className?: string
}

export const ConsoleButton: React.FC<ConsoleButtonProps> = ({
  children,
  variant = "outlined",
  onClick,
  className = "",
}) => {
  const baseClasses =
    "px-6 py-3 text-sm font-mono uppercase tracking-wide transition-all duration-200 cursor-pointer"

  const variantClasses = {
    console_key:
      "bg-gray-100 border border-gray-300 rounded-full hover:bg-black hover:text-white hover:border-black",
    outlined:
      "border border-black bg-transparent hover:bg-black hover:text-white",
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
