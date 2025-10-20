//src/app/_components/Header.tsx
'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession"
import { supabase } from "@/lib/supabase"

export default function Header() {
  const router = useRouter()
  const { session, isLoading } = useSupabaseSession()
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }


  return (
    <header className="flex justify-between items-center w-full max-w-md px-4 py-3 bg-gray-900 text-white">
      <Link href="/" className="text-lg font-bold">
        SutoMemo <span className="text-sm">(ストめも)</span>
      </Link>

      {isLoading ? (
        <span className="text-gray-400 text-sm">読み込み中...</span>
      ) : session ? (
        <div className="flex gap-3 items-center">
              <Link href="/dashboard" className="hover:underline text-sm">
                ダッシュボード
              </Link>
              <button onClick={handleLogout} className="text-gray-200 hover:underline text-sm">
                ログアウト
              </button>
        </div>
          ) : (
            <Link href="/login" className="bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-300">
              ログイン
            </Link>
          )}
    </header>
  )  
}