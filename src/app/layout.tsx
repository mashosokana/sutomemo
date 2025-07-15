// app/layout.tsx

import "./globals.css"
import Header from "./_components/Header"

export const metadata = {
  title: "SutoMemo",
  description: "学習の記録メモアプリ",
}

export default function RootLayout({ children }: {children:  React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="gb-gray-50 text-white">
        <Header />
        <main className="max-w-3xl mx-auto mt-8 px-4">
          {children}
        </main>
      </body>
    </html>
  )
}