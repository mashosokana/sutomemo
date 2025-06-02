'use client'

import { useState } from 'react';
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMassage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({email, password })

    if (error) {
      setErrorMessage(error.message)
    } else {
      router.push('/login')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">新規登録</h1>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="メールアドレスを入力"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="パスワードを入力"
          />
        </div>

        {errorMassage && (
          <p className="text-red-500 text-sm mb-4">
            {errorMassage}
          </p>
        )}

        <button 
          onClick={handleSignUp}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 py-2 rounded-xl font-semibold transition"
        >
          登録する  
        </button>
      </div>
    </main>
  )
}