// components/Card.tsx
export default function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-md shadow p-4 ${className}`}>
      {children}
    </div>
  )
}
