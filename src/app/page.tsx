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

  const primaryButton =
    'w-full rounded-xl bg-[#1f2937] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#111827] disabled:opacity-50';
  const secondaryButton =
    'w-full rounded-xl border border-[#E8D5C4] bg-white py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-[#FFF5E6] disabled:opacity-50';

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
    <main className="w-full bg-gradient-to-b from-[#FFFCF7] via-[#FFF8EF] to-[#FFF3E3] text-zinc-900">
      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <section className="space-y-8">
          <div className="flex !flex-col gap-6">
            <div className="space-y-3 border-l-4 border-[#E8D5C4] pl-4">
              <p className="text-3xl font-bold leading-tight tracking-tight text-zinc-900">
                「何か残したい」けど
              </p>
              <p className="text-lg font-medium leading-relaxed text-zinc-700">
                「どう伝えればいいかわからない」
              </p>
            </div>
            <div className="relative h-56 overflow-hidden rounded-3xl shadow-sm ring-1 ring-[#E8D5C4]">
              <Image
                src="/icons/26465757.jpg"
                alt="悩んでいる人"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 288px"
                className="object-cover"
              />
            </div>
            <p className="text-sm leading-relaxed text-zinc-600">
              画像を見ながら言葉を置くだけ。SutoMemoは、続けやすい投稿体験を作るためのシンプルなメモツールです。
            </p>
          </div>

          <p className="text-center text-xs font-medium tracking-wide text-[#8B5E3C]">
            ユーザーの投稿が11,000回以上閲覧されました
          </p>

          <div className="grid grid-cols-1 gap-3">
            <Link href="/signup">
              <button className={primaryButton}>ユーザー登録</button>
            </Link>
            <button
              onClick={handleGuestLogin}
              className={secondaryButton}
              disabled={loading}
            >
              {loading ? 'ログイン中…' : 'お試しログイン'}
            </button>
          </div>
        </section>

        <section className="mt-12 border-t border-[#E8D5C4] pt-10">
          <h2 className="mb-6 text-lg font-semibold text-zinc-900">シンプルな操作</h2>
          <ol className="space-y-5">
            <li className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5E3C] text-sm font-semibold text-white shadow-sm">
                1
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">📷 画像を選択</p>
                <p className="text-xs leading-relaxed text-zinc-600">クリックまたはドラッグ&ドロップ</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5E3C] text-sm font-semibold text-white shadow-sm">
                2
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">✍️ テキスト入力と配置調整</p>
                <p className="text-xs leading-relaxed text-zinc-600">タップで追加、ドラッグで移動、ピンチで拡大縮小</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5E3C] text-sm font-semibold text-white shadow-sm">
                3
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">💾 保存して共有</p>
                <p className="text-xs leading-relaxed text-zinc-600">SNSでシェアまたはダウンロード</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mt-12 border-t border-[#E8D5C4] pt-10">
          <div className="flex flex-col gap-5">
            <Image
              src="/icons/1453103.jpg"
              alt="メモする人"
              width={170}
              height={149}
              className="mx-auto h-auto rounded-2xl"
            />
            <div className="space-y-4 text-sm leading-relaxed text-zinc-700">
              <p>
                このアプリは、あなたの日々の学びや気づきを画像メモとして簡単に記録・共有できるツールです。
              </p>
              <p>
                直感的な操作で、リール動画用の画像メモを作成。画像を選んで、タップしてテキストを追加、ドラッグで配置するだけ。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 border-t border-[#E8D5C4] pt-10 text-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900">実際の投稿実績</h2>
          <div className="mt-5 grid grid-cols-2 gap-6">
            <div>
              <p className="text-3xl font-bold text-[#8B5E3C]">11,251</p>
              <p className="mt-1 text-xs text-zinc-600">回再生</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#8B5E3C]">4,404</p>
              <p className="mt-1 text-xs text-zinc-600">回再生</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-600">
            シンプルな画像メモでも、多くの人に届いています。
          </p>
          <ul className="mt-6 space-y-2 text-xs text-zinc-600">
            <li>・無料でご利用いただけます</li>
            <li>・投稿データはあなただけのもの（非公開）</li>
            <li>・アカウントはいつでも削除できます</li>
          </ul>
        </section>

        <section className="mt-12 border-t border-[#E8D5C4] pt-10 text-sm leading-relaxed text-zinc-700">
          <p className="text-base font-semibold text-zinc-900">「毎日投稿できる人」になりたいあなたへ</p>

          <div className="mt-5 flex flex-col gap-4">
            <p>
              「よし、今週こそは毎日投稿しよう」
              そう思ってアプリを開いたものの、複雑すぎて続かない。
            </p>
            <div className="w-full">
              <Image
                src="/icons/1750995.jpg"
                alt="悩む人"
                width={208}
                height={166}
                priority
                className="mx-auto h-auto rounded-2xl"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p>
              そんな経験ありませんか？SutoMemoは、考える前に
              <span className="font-semibold text-[#8B5E3C]">&ldquo;作れる&rdquo;</span>
              習慣をつくります。
            </p>
            <p>
              画像を見ながらテキストを書けるから、自然と言葉が出てくる。タップでテキストを追加、ドラッグで移動、ピンチで拡大縮小。直感的な操作で誰でも使えます。
            </p>
            <p className="font-semibold text-zinc-900">
              実際に、ユーザーの投稿は数千〜数万回も再生されています。
            </p>
            <p>気づけばあなたのフォロワーが、あなたの言葉を楽しみにしています。</p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <Image
              src="/icons/2466299.jpg"
              alt="sns"
              width={215}
              height={167}
              priority
              className="h-auto w-auto rounded-2xl"
            />
            <div>
              <p className="text-lg font-semibold text-zinc-900">「続けられなかったあなた」</p>
              <p className="mt-1">
                才能ではなく<br />
                仕組みで解決しましょう。
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="font-semibold text-zinc-900">\シンプルな操作で投稿できる自分へ/</p>
            <p className="mt-2">
              今すぐ使って、<br />
              今日のあなたの言葉を<br />
              世界に届けよう
            </p>
          </div>
        </section>

        <div className="mt-10 grid grid-cols-1 gap-3">
          <Link href="/signup">
            <button className={primaryButton}>ユーザー登録</button>
          </Link>
          <button
            onClick={handleGuestLogin}
            className={secondaryButton}
            disabled={loading}
          >
            {loading ? 'ログイン中…' : 'お試しログイン'}
          </button>
        </div>
      </div>
    </main>
  );
}
