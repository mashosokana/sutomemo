//app/compose/input/page.tsx
"use client"

import { useEffect } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import ComposeInputForm from "./form";
import { useRouter } from "next/navigation";

export default function ComposeInputPage() {
  const router = useRouter()
  const { session, isLoading, token } = useSupabaseSession()

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login')
    }
  }, [isLoading, session, router])

  if (isLoading) return <div className="p-4">読み込み中...</div>
  if (!session) return null

  return <ComposeInputForm userId={session.user.id} token={token} />
}