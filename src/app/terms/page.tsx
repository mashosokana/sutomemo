export const metadata = {
  title: "利用規約 | SutoMemo",
  description: "SutoMemoの利用規約です。",
};

export default function TermsPage() {
  return (
    <main className="bg-white text-black w-[393px] px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">利用規約</h1>
        <p className="text-xs text-gray-600">最終更新日: 2026年2月17日</p>
      </header>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">1. 本規約について</h2>
        <p>
          この利用規約（以下「本規約」）は、SutoMemo（以下「本サービス」）の利用条件を定めるものです。
          ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">2. アカウント</h2>
        <p>
          ユーザーは、正確な情報を提供してアカウントを登録するものとします。
          アカウントの管理責任はユーザーにあり、第三者への譲渡・貸与はできません。
          ユーザーはいつでもアカウントの削除を運営者に依頼できます。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">3. 禁止事項</h2>
        <p>ユーザーは、以下の行為を行ってはなりません。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>法令または公序良俗に違反する行為</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>不正アクセスやシステムへの攻撃行為</li>
          <li>虚偽の情報を登録する行為</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">4. 知的財産権</h2>
        <p>
          本サービスに関する知的財産権は運営者に帰属します。
          ユーザーが投稿したコンテンツの著作権はユーザーに帰属しますが、
          本サービスの運営に必要な範囲で利用を許諾するものとします。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">5. 免責事項</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>本サービスは現状有姿で提供され、特定目的への適合性を保証するものではありません。</li>
          <li>運営者は、本サービスの中断・停止・変更・終了によりユーザーに生じた損害について、一切の責任を負いません。</li>
          <li>ユーザー間またはユーザーと第三者間のトラブルについて、運営者は責任を負いません。</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">6. 規約の変更</h2>
        <p>
          運営者は、必要に応じて本規約を変更できるものとします。
          重要な変更がある場合は、本サービス上でお知らせします。
          変更後も本サービスを継続して利用した場合、変更後の規約に同意したものとみなされます。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">7. 準拠法・管轄</h2>
        <p>
          本規約は日本法に準拠し、本サービスに関する紛争については、
          東京地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </section>
    </main>
  );
}
