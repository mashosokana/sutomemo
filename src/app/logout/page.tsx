// app/logout/actions.ts
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut()
      router.replace("/login")
    }

    logout()
  }, [router])

  return <p className="p-4">ログアウト中...</p>
}