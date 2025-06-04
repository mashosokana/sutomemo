import Link from 'next/link';

export default function SignUpSuccessPage() {
  return (
    <main className='flex min-h-screen items-center justify-center bg-gray-100'>
      <div className='w-full max-w-md p-8 bg-white rounded-2xl shadow-lg text-center'>
        <h1 className='text-3xl font-bold mb-4 text-green-600'>
          登録ありがとうございます！
        </h1>
        <p className='text-gray-700 mb-6 leading-relaxed'>
          ご登録いただいたメールアドレスに確認メールを送信しました。<br />
          Supabase AuthからConfirm Your Signup （サインアップを確認する）
          というメールが届いていると思います。
          確認メールのリンクをクリックすると、
          登録が完了しログインできるようになります。
          お手数ですが、メールボックスをご確認の上、
          メール内のリンクをクリックして登録を完了してください。
        </p>
        <p className="text-sm text-gray-500 mb-6">
          （迷惑メールフォルダに分類されている可能性もありますので、ご確認ください。）
        </p>
        <Link href='/login' passHref>
          <button className='w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition duration-300 ease-in-out'>
            ログインページへ
          </button>
        </Link>
        </div>
    </main>
  )
}