// app/layout.tsx

import "./globals.css"
import { Inter } from "next/font/google";
import Header from "./_components/Header"; 

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
        <div className="w-[393px] min-h-screen bg-black flex flex-col">
            <Header />
          <main className="flex-1 pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
