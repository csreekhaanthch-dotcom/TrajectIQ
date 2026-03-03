export const metadata = {
  title: 'TrajectIQ - Intelligence-Driven Hiring',
  description: 'AI-powered candidate evaluation platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
