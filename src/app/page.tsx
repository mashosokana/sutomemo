//src/app/page.tsx

'use client'

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/auth/guest-login', { method: 'POST' });
      const body = await res.json();

      if (!res.ok) {
        alert(`ログイン失敗: ${body?.error ?? res.statusText}`);
        setLoading(false);
        return;
      }

      if (body.access_token && body.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });
        if (error) {
          alert(`セッション同期失敗: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('ログイン失敗: ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-white ext-black w-[393px] px-6 space-y-6">
      <div className="bg-white text-black w-full max-w-md px-6 py-6 space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <p className="text-red-500 font-bold text-[20px]">「何か残したい」けど</p>
            <p className="text-sm mt-1 leading-relaxed text-[20px]">「どう書けばいいかわからない」</p>
          </div>

          <div className="relative w-[134px] h-[100px] flex-shrink-0">
            <Image
              src="/icons/26465757.jpg"
              alt="悩んでいる人"
              fill
              priority
              sizes="134px" 
              className="object-contain"
            />
          </div>
        </div>
        <p className="text-center text-gray-700 text-sm">
          わずか３ステップで自己表現が習慣に
        </p>
        <div className="flex justify-center">
          <Image
            src="/icons/icon1.png"
            alt="メモ"
            width={343}
            height={172}
            priority
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <section className="space-y-4 text-sm leading-relaxed text-gray-800">
          <div className="flex items-start space-x-3">
            <Image src="/icons/1453103.jpg" alt="メモする人" width={134} height={117} />
            <p>
              このアプリは、あなたの思考やひらめきをメモやストーリーとして記録し、
              SNSで発信するクリエイティブ体験をサポートします。
            </p>
          </div>
          <p>
            ３つの質問と１つのメモから始まる、あなた独自の世界観をシェアしましょう。
          </p>
        </section>

        {/* ボタン */}
        <div className="space-y-3">
          <Link href="/signup">
            <button className="w-full bg-black text-white py-2 rounded mb-2 font-bold">ユーザー登録</button>
          </Link>
          <button
            onClick={handleGuestLogin}
            className="w-full border border-black text-black py-2 rounded font-bold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'ログイン中…' : 'お試しログイン'}
          </button>
        </div>

        <section className="space-y-6 text-sm leading-relaxed text-gray-800">
          <div className="bg-[#FFF5E6] p-4 rounded-lg text-center">
            <p className="mb-2">「毎日投稿できる人」になりたいあなたへ</p>
            <p>
              たった3問で、自分らしい言葉が自然に出てくるアプリ。
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg flex items-center justify-between">
            <p className="mb-2 text-left flex-1 mr-4">
              「よし、今週こそは毎日投稿しよう」
              そう思ってアプリを開いたものの、投稿が1回もできずに終わる。
            </p>
            <div style={{ width: 155, height: "auto" }}>
              <Image 
                src="/icons/1750995.jpg" 
                alt="メモする人" 
                width={155} 
                height={124}
                priority
                style={{ height: "auto" }} 
              />
            </div>
          </div>
          <div className="bg-[#FFF5E6] p-4 rounded-lg text-center">
            <p>
              そんな経験ありませんか？SutoMemoは、考える前に”書ける”習慣をつくります。
              ３つの質問で思考が整理され、あとにアプリが言葉をまとめてくれます。
            </p>
          </div>
          <div className="bg-[#FFF5E6] p-4 rounded-lg">
            <p>
              続けることで、発信は「自己ブランディング」へと変わります。
              気づけばあなたのフォロワーが、あなたの言葉を楽しみにしています。
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg flex flex-col items-center text-center space-y-4">
            <Image 
              src="/icons/2466299.jpg" 
              alt="sns" 
              width={215} 
              height={167}
              priority 
              style={{ width: "auto", height: "auto" }}
            />
            <p className="mb-2 flex-1 mr-4">
              「続けられなかったあなた」<br />
              才能ではなく<br />
              仕組みで解決しましょう。
            </p>
          </div>

          <div className="bg-[#FFF5E6] p-4 rounded-lg text-center">
            <p>
              \たった３問で投稿できる自分へ/<br />
              今すぐ使って、<br />
              今日のあなたの言葉を<br />
              世界に届けよう<br />
            </p>
          </div>
        </section>

        <div className="space-y-3 mt-4">
          <Link href="/signup">
            <button className="w-full bg-black text-white py-2 rounded mb-2 font-bold">ユーザー登録</button>
          </Link>
          <button
            onClick={handleGuestLogin}
            className="w-full border border-black text-black py-2 rounded font-bold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'ログイン中…' : 'お試しログイン'}
          </button>
        </div>
      </div>
    </main>
  );
}
