"use client"

import { useEffect, useState } from "react"
import { ThemeToggle } from "~/components/theme-toggle"

export function ClientThemeToggle() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <ThemeToggle />
}