//aec/app/_components/Header.tsx
'use client'

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession"
import { supabase } from "@/utils/supabase"

export default function Header() {
  const router = useRouter()
  const { session, isLoading } = useSupabaseSession()
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    window.location.reload()
  }

  useEffect(() => {
    console.log("現在のセッション:", session);
  }, [session]);
  

  return (
    <header className="bg-gray-100 p-4 flex justify-between item-center shadow">
      <Link href="/" className="text-lg font-bold text-blue-600">
        SutoMemo
      </Link>

      {isLoading ? (
        <div className="text-gray-500">読み込み中...</div>
      ) : session ? (
            <>
              <Link href="/dashboard" className="hover:underline text-gray-700">
                ダッシュボード
              </Link>
              <button onClick={handleLogout} className="text-red-500 hover:underline">
                ログアウト
              </button>
            </>
          ) : (
            <Link href="/login" className="text-blue-500 hover:underline">
              ログイン
            </Link>
          )}
    </header>
  )  
}