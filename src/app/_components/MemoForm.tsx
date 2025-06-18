// app/components/MemoForm.tsx
'use client'

import { useState } from 'react'

type Memo = {
  freeMemo: string | null
  answerWhy: string | null
  answerWhat: string | null
  answerNext: string | null
} | null

export default function MemoForm({
  postId,
  memo,
  onSaved,
}: {
  postId: number
  memo: Memo
  onSaved: () => void
}) {
  const [freeMemo, setFreeMemo] = useState(memo?.freeMemo ?? '')
  const [why,   setWhy] = useState(memo?.answerWhy  ?? '')
  const [what, setWhat] = useState(memo?.answerWhat ?? '')
  const [next, setNext] = useState(memo?.answerNext ?? '')

  const save = async () => {
    const res =await fetch(`/api/memos/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + localStorage.getItem('token'),
      },
      body: JSON.stringify({
        freeMemo,
        answerWhy:  why,
        answerWhat: what,
        answerNext: next,
      }),
    })

    if (res.ok) {
      alert('保存しました')
      onSaved()
    } else {
      alert('保存失敗')
    }
  }

  return (
    <section className='space-y-2'>
      <textarea value={freeMemo} onChange={(e) => setFreeMemo(e.target.value)} placeholder='フリーメモ' className='border w-full' />
      <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder='Why'  className='boder w-full' />
      <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="What?" className="border w-full" />
      <input value={next} onChange={(e) => setNext(e.target.value)} placeholder="Next?" className="border w-full" />
      <button onClick={save} className="px-3 py-1 bg-blue-600 text-white rounded">保存</button>      
    </section>
  )
}