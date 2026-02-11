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
    if (loading) return;
    try {
      setLoading(true);

      const res = await fetch('/api/auth/guest-login', { method: 'POST' });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        alert(`ログイン失敗: ${body?.error ?? res.statusText}`);
        return;
      }

      if (body.access_token && body.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });
        if (error) {
          alert(`セッション同期失敗: ${error.message}`);
          return;
        }
      } else {
        alert('ログイン失敗: トークンが取得できませんでした');
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
      alert('ログイン失敗: ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-white text-black w-[393px] px-6 space-y-6">
      <div className="bg-white text-black w-full max-w-md px-6 py-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <p className="text-red-500 font-bold text-[20px]">「何か残したい」けど</p>
            <p className="text-sm mt-1 leading-relaxed text-[20px]">「どう伝えればいいかわからない」</p>
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

        {/* サブキャッチ */}
        <p className="text-center text-gray-700 text-sm">
          わずか3ステップで画像メモが完成！
        </p>

        {/* 実績バッジ */}
        <div className="bg-[#FFF5E6] p-4 rounded-lg text-center border-2 border-[#E8D5C4]">
          <p className="text-sm font-bold text-gray-800">
            ✨ ユーザーの投稿が11,000回以上閲覧されました ✨
          </p>
        </div>

        {/* 3ステップ表示 */}
        <div className="bg-[#FFF5E6] p-6 rounded-lg border-2 border-[#E8D5C4]">
          <h3 className="text-center font-bold text-lg mb-6 text-gray-800">シンプルな3ステップ</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-[#E8D5C4]">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 mb-1">📷 画像を選択</p>
                <p className="text-xs text-gray-600">クリックまたはドラッグ&ドロップ</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-[#E8D5C4]">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 mb-1">✍️ テキスト入力と配置調整</p>
                <p className="text-xs text-gray-600">ドラッグで位置、スライダーでサイズ変更</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-[#E8D5C4]">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 mb-1">💾 保存して共有</p>
                <p className="text-xs text-gray-600">SNSでシェアまたはダウンロード</p>
              </div>
            </div>
          </div>
        </div>

        {/* メインコピー */}
        <section className="space-y-4 text-sm leading-relaxed text-gray-800">
          <div className="flex items-start space-x-3">
            <Image src="/icons/1453103.jpg" alt="メモする人" width={134} height={117} />
            <div>
              <p className="mb-2">
                このアプリは、あなたの日々の学びや気づきを画像メモとして簡単に記録・共有できるツールです。
              </p>
              <p>
                シンプルな3ステップで、リール動画用の画像メモを作成。画像を選んで、テキストを書いて、位置を調整するだけ。
              </p>
            </div>
          </div>
        </section>

        {/* 実績セクション */}
        <div className="bg-[#FFF5E6] p-4 rounded-lg border-2 border-[#E8D5C4]">
          <p className="font-bold text-center mb-3 text-gray-800">実際の投稿実績</p>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">11,251</p>
              <p className="text-xs text-gray-600">回再生</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">4,404</p>
              <p className="text-xs text-gray-600">回再生</p>
            </div>
          </div>
          <p className="text-xs text-center mt-3 text-gray-700">
            シンプルな画像メモでも、多くの人に届いています。
          </p>
        </div>

        {/* 既存ボタン（お試しログイン） */}
        <div className="space-y-3 mt-4">
          <Link href="/signup">
            <button className="w-full bg-black text-white py-2 rounded font-bold">
              ユーザー登録
            </button>
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
          {/* 問題提起 */}
          <div className="bg-[#FFF5E6] p-4 rounded-lg text-center border-2 border-[#E8D5C4]">
            <p className="font-bold mb-2">「毎日投稿できる人」になりたいあなたへ</p>
          </div>

          <div className="bg-white p-4 rounded-lg flex items-center justify-between border-2 border-[#E8D5C4]">
            <p className="text-left flex-1 mr-4">
              「よし、今週こそは毎日投稿しよう」
              そう思ってアプリを開いたものの、複雑すぎて続かない。
            </p>
            <div className="w-[155px] h-auto flex-shrink-0">
              <Image
                src="/icons/1750995.jpg"
                alt="悩む人"
                width={155}
                height={124}
                priority
                className="h-auto"
              />
            </div>
          </div>

          {/* 解決策 */}
          <div className="bg-[#FFF5E6] p-4 rounded-lg border-2 border-[#E8D5C4]">
            <p className="mb-3">
              そんな経験ありませんか？SutoMemoは、考える前に<span className="font-bold text-gray-800">&ldquo;作れる&rdquo;</span>習慣をつくります。
            </p>
            <p>
              画像を見ながらテキストを書けるから、自然と言葉が出てくる。ドラッグで位置を調整、スライダーでサイズ変更。直感的な操作で誰でも使えます。
            </p>
          </div>

          {/* ベネフィット */}
          <div className="bg-[#FFF5E6] p-4 rounded-lg border-2 border-[#E8D5C4]">
            <p className="mb-3">
              続けることで、発信は「自己ブランディング」へと変わります。
            </p>
            <p className="font-bold text-gray-800 mb-2">
              実際に、ユーザーの投稿は数千〜数万回も再生されています。
            </p>
            <p>
              気づけばあなたのフォロワーが、あなたの言葉を楽しみにしています。
            </p>
          </div>

          {/* クロージング */}
          <div className="bg-white p-4 rounded-lg flex flex-col items-center text-center space-y-4 border-2 border-[#E8D5C4]">
            <Image
              src="/icons/2466299.jpg"
              alt="sns"
              width={215}
              height={167}
              priority
              className="w-auto h-auto"
            />
            <div>
              <p className="font-bold text-lg mb-2">「続けられなかったあなた」</p>
              <p>
                才能ではなく<br />
                仕組みで解決しましょう。
              </p>
            </div>
          </div>

          <div className="bg-[#FFF5E6] p-5 rounded-lg text-center border-2 border-[#E8D5C4]">
            <p className="font-bold text-gray-800 mb-2">
              \シンプルな3ステップで投稿できる自分へ/
            </p>
            <p>
              今すぐ使って、<br />
              今日のあなたの言葉を<br />
              世界に届けよう
            </p>
          </div>
        </section>

        <div className="space-y-3 mt-4">
          <Link href="/signup">
            <button className="w-full bg-gray-800 text-white py-2 rounded font-bold">
              ユーザー登録
            </button>
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
