import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "SignalLens",
  description:
    "Financial document intelligence with graph-based anomaly detection.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <div className="relative isolate min-h-screen overflow-x-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(18,164,164,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(242,123,91,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,240,232,0.82))] dark:bg-[radial-gradient(circle_at_top_left,rgba(18,164,164,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(242,123,91,0.12),transparent_28%),linear-gradient(180deg,rgba(10,20,28,0.96),rgba(11,17,23,1))]"
            />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
