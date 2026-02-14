import React from "react"
import './globals.css'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <title>Parallels.... - Marketing Analytics Platform</title>
        <meta name="description" content="Track your sales, revenue, and marketing performance in one place. Connect your store and start making data-driven decisions." />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

