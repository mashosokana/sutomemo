// components/Card.tsx
// src/app/components/Card.tsx
'use client'

export default function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`
        bg-white               /* 背景 */
        rounded-md             /* 角丸 4px */
        border border-gray-200 /* 枠線 */
        shadow-sm              /* 薄い影 */
        p-4                    /* 余白 */
        ${className}           /* 追加クラスを後ろに */
      `}
    >
      {children}
    </div>
  );
}
