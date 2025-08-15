'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GuestLoginButton() {
  const router = useRouter()

  const handleGuestLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'supabase994@gmail.com',
      password: 'sisi4405',
    })

    if (error) {
      alert(`ログインに失敗しました: ${error.message}`)
      return
    }
    
    router.push('/dashboard')
  }

  return (
    <button
      onClick={handleGuestLogin}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
    >
      お試しログイン
    </button>
  )
}
