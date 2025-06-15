//src/app/layout.tsx
import { Noto_Sans_JP } from 'next/font/google'
import "./globals.css"   // これが無いと CSS が読み込まれません

const noto = Noto_Sans_JP({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={noto.className}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
