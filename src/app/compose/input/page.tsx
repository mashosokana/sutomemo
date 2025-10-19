//app/compose/input/page.tsx
"use client"

import { useEffect } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import ComposeInputForm from "./form";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ComposeInputContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, isLoading, token } = useSupabaseSession()

  const initialCaption = searchParams.get('caption') || undefined

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login')
    }
  }, [isLoading, session, router])

  if (isLoading) return <div className="p-4">読み込み中...</div>
  if (!session) return null

  return <ComposeInputForm userId={session.user.id} token={token} initialCaption={initialCaption} />
}

export default function ComposeInputPage() {
  return (
    <Suspense fallback={<div className="p-4">読み込み中...</div>}>
      <ComposeInputContent />
    </Suspense>
  )
}