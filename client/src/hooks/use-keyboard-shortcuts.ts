import { useEffect } from "react"

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement

      if (e.key === "Enter" && target.tagName === "BUTTON") {
        const button = target as HTMLButtonElement
        if (
          !button.disabled &&
          button.type !== "submit" &&
          button.type !== "reset"
        ) {
          button.click()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])
}
