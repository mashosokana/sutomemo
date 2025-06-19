// src/app/_components/ImageUploader.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import Input from '@/app/_components/Input'

export default function ImageUploader({
  postId,
  onUploaded,
}: {
  postId: number
  onUploaded?: (url: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)

    const ext = file.name.split('.').pop()
    const safeName = `${Date.now()}.${ext}`
    const filePath = `${postId}/${safeName}`

    const { error } = await supabase.storage
      .from('post-images')
      .upload(filePath, file, {
        cacheControl: '3600',   // ❶ Content-Type を明示
        upsert: false,
        contentType: file.type,            // ❷ 同名があればエラーにする
      })

    if (error) {
      console.error('[Storage Upload Error]', error)   // ★追加
      alert(`Upload failed: ${error.message}`)
      setLoading(false)
      return
    }

    const { data } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath)

    await fetch(`/api/images/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ url: data.publicUrl }),
    })

    setLoading(false)
    onUploaded?.(data.publicUrl)
    setFile(null)
  }

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="file:border file:mr-4 file:px-3 file:py-1"
      />
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-3 py-1 bg-primary text-white rounded disabled:opacity-50"
      >
        {loading ? 'アップロード中…' : 'アップロード'}
      </button>
    </div>
  )
}
