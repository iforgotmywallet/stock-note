import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "~/components/providers";
import { Toaster } from "sonner";
import { ClientThemeToggle } from "~/components/client-theme-toggle";

export const metadata: Metadata = {
  title: "StockNotes",
  description: "professional analyst notes for your faviorite stocks",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="flex min-h-svh flex-col">
        <Providers>
          {children}
          <div className="fixed top-4 right-4 z-50">
            <ClientThemeToggle />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
