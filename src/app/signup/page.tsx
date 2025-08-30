//src/app/signup/page.tsx
'use client'

import { useState } from 'react';
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading ] = useState(false)
  const router = useRouter()

  const isValidPassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSymbol = /[@$!%*#?&]/.test(password)
    return hasMinLength && hasLetter && hasNumber && hasSymbol
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    if (!isValidPassword(password)) {
      setErrorMessage('パスワードは8文字以上かつ、英字・数字・記号（@$!%*#?&）を含めてください。')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/signup-success`,
        },
      })

      if (process.env.NODE_ENV !== 'production') {
        console.log('SignUp Result:', { data, error });
        }

      if (error) {
        setErrorMessage(error.message)
        return
      }
      
      router.replace('/signup-success')
    } catch {
      setErrorMessage('登録中に問題が発生しました。時間をおいてお試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='min-h-screen flex items-center justify-center bg-gray-100 px-4'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow-lg p-8'>
        <h1 className='text-2xl font-bold mb-6 text-center'>新規登録</h1>
        {/* 処理中はフォーム全体が busy */}
        <form onSubmit={handleSubmit} className='space-y-5' aria-busy={loading}>
          <div>
            <label htmlFor='email' className='block mb-2 text-sm font-medium text-gray-700'>
              メールアドレス
            </label>
            <input
              type='email'
              id='email'
              className='block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400 bg-white'
              placeholder='name@example.com'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
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
              autoComplete='new-password'
              aria-describedby='password-note'
            />
          </div>

          {errorMessage && (
            <p className='text-red-500 text-sm text-center' role='alert' aria-live='assertive'>
              エラー: {errorMessage}
            </p>
          )}

          <button
            type='submit'
            className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50'
            disabled={loading}
          >
            {loading ? '登録中...' : '登録'}
          </button>

          <div id='password-note' className='text-sm text-gray-600 mt-4'>
            <p className='font-semibold text-gray-800 mb-1'>注意</p>
            <ul className='list-disc list-inside space-y-1'>
              <li>8文字以上</li>
              <li>アルファベットを含む</li>
              <li>数字を含む</li>
              <li>記号（@ $ ! % * # ? &）を含む</li>
            </ul>
          </div>

          <p className='text-sm text-center text-gray-600 mt-6'>
            アカウントをお持ちの方は{' '}
            <Link href='/login' className='text-blue-600 hover:underline font-medium'>
              ログイン
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
