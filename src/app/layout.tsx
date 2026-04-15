// app/layout.tsx

import "./globals.css"
import Link from "next/link";
import { Inter } from "next/font/google";
import Header from "./_components/Header"; 
import { AuthProvider } from "./hooks/useAuth";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SutoMemo",
  description: "学習の記録メモアプリ",
}

export default function RootLayout({ 
  children 
}: {
  children:  React.ReactNode;
 }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-black text-white flex justify-center`}>
        <AuthProvider>
          <div className="w-[393px] min-h-screen bg-black flex flex-col">
              <Header />
            <main className="flex-1 pb-8">{children}</main>
            <footer className="px-4 pb-6 text-center text-xs text-gray-400 space-x-3">
              <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-gray-200">
                プライバシーポリシー
              </Link>
              <Link href="/terms" className="underline underline-offset-2 hover:text-gray-200">
                利用規約
              </Link>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
