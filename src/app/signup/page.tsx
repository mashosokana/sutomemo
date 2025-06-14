//src/app/signup/page.tsx
'use client'

import { useState } from 'react';
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading ] = useState(false)

  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    setLoading(false);

    if (error) {
      setErrorMessage(error.message)
    } else {
      router.push('/signup-success')
    }
  }

  return (
    <div className='flex justify-center pt-[240px]'>
      <form onSubmit={handleSubmit} className='space-y-4 w-full max-w-[400px]'>
        <div>
          <label
            htmlFor='email'
            className='block mb-2 text-sm font-medium text-gray-900'
          >
            メールアドレス
          </label>
          <input
            type='email'
            name='email'
            id='email'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
            placeholder='name@company.com'
            required
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <div>
          <label
            htmlFor='password'
            className='block mb-2 text-sm font-medium text-gray-900'
          >
            パスワード
          </label>
          <input
            type='password'
            name='password'
            id='password'
            placeholder='••••••••'
            className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5'
            required
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
          <p className='text-red-500 text-sm text-center'>
            {errorMessage}
          </p>

        <div>
          <button
            type='submit'
            disabled={loading}
            className='w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50'
          >
            {loading ? '登録中...' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}