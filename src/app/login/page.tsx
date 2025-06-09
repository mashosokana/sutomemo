'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setErrorMessage('')
    setLoading(true)

    const { error,data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log(data?.session?.access_token);

    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
    } else {

      localStorage.setItem("token", data.session.access_token);
      
      router.replace('/dashboard')
    }
  }

  return (
    <main className='min-h-screen flex items-center justify-center bg-gray-100 px-4'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow-lg p-8'>
        <h1 className='text-2xl font-bold mb-6 text-center'>ログイン</h1>
        <form onSubmit={handleSubmit} className='space-y-5'>
          <div>
            <label htmlFor='email' className='block mb-2 text-sm font-medium text-gray-700'>
              メールアドレス
            </label>
            <input
              type='email'
              id='email'
              className='block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              placeholder='name@example.com'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor='password' className='block mb-2 text-sm font-medium text-gray-700'>
              パスワード
            </label>
            <input
              type='password'
              id='password'
              className='block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black'
              placeholder='••••••••'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

        {errorMessage && (
          <p className='text-red-500 text-sm text-center'>
            {errorMessage}
          </p>
        )}
        
        <button
          type='submit'
          className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50'
          disabled={loading}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button> 
      </form>

      {/* 新規登録やパスワード忘れのリンクは後で追加予定 */}
     </div>
    </main>
  )
}