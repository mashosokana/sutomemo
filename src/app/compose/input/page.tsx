// app/compose/input/page.tsx
"use client" 

import { useRouter } from "next/navigation"
import { FormEvent, useState } from 'react'

export default function ComposePage() {
  const router = useRouter()
  const [caption, setCaption] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [loading,setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + localStorage.getItem('token'),
      },
      body: JSON.stringify({ caption, status }),
    })
    
    if (!res.ok) {
      alert('保存失敗')
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

    return (
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="キャプション"
          className="border w-full p-2"
        /> 
        <select
          value={status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
            setStatus(e.target.value as "draft" | "published")
          }
          className="border p-2"
        >
          <option value="draft">下書き</option>
          <option value="published">公開</option>
        </select>

        <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? '送信中...' : '投稿する'}
        </button>
      </form>
    )
  
}

