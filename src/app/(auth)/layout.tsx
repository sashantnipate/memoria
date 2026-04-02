export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        {/* No Header here! Just the centered form */}
        {children}
    </div>
  )
}