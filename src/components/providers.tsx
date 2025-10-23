"use client"

import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { authClient } from "~/lib/auth-client"
import { ThemeProvider } from "~/components/theme-provider"


export function Providers({ children }: { children: ReactNode }) {
    const router = useRouter()

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="stocknotes-theme"
        >
            <AuthUIProvider
                authClient={authClient}
                navigate={router.push}
                replace={router.replace}
                onSessionChange={() => {
                    // Clear router cache (protected routes)
                    router.refresh()
                }}
                Link={Link}
            >
                {children}
            </AuthUIProvider>
        </ThemeProvider>
    )
}