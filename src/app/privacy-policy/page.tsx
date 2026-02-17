export const metadata = {
  title: "プライバシーポリシー | SutoMemo",
  description: "SutoMemoのプライバシーポリシーです。",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white text-black w-[393px] px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
        <p className="text-xs text-gray-600">最終更新日: 2026年2月10日</p>
      </header>

      <section className="space-y-2 text-sm leading-relaxed">
        <p>
          SutoMemo（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に
          取り組みます。本ポリシーでは、本サービスにおける個人情報等の取扱いについて説明します。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">1. 取得する情報</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>アカウント情報（メールアドレス、表示名など）</li>
          <li>投稿・メモ等の入力内容、画像・動画などのアップロードデータ</li>
          <li>認証・セキュリティ維持に必要なトークンや識別子</li>
          <li>利用状況に関する情報（アクセス日時、端末情報、ログ等）</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">2. 利用目的</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>本サービスの提供・運営、ユーザー認証</li>
          <li>機能改善や品質向上、利用状況の分析</li>
          <li>不正利用の防止、安全性の確保</li>
          <li>問い合わせ対応や重要なお知らせの通知</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">3. 第三者提供・委託</h2>
        <p>
          本サービスは、データの保管・認証・生成機能の提供等のために、外部サービス事業者
          に業務を委託する場合があります。現在利用している主な外部サービスは以下のとおりです。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supabase（認証・データベース・ストレージ）</li>
          <li>Vercel（ホスティング・配信）</li>
        </ul>
        <p>
          この場合、委託先と適切な契約を締結し、個人情報の安全管理を徹底します。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">4. 保管期間</h2>
        <p>
          取得した情報は、本サービスの提供に必要な期間保持し、不要となった場合は適切な方法で
          速やかに削除します。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">5. ユーザーの権利</h2>
        <p>
          ユーザーは、ご自身の情報の開示・訂正・削除等を求めることができます。
          ご希望の場合は、下記「お問い合わせ」に記載の連絡先までご連絡ください。
        </p>
        <p>
          アカウントおよびデータの削除をご希望の場合は、運営者へメールにてご連絡ください。
          確認後、速やかに対応いたします。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">6. セキュリティ</h2>
        <p>
          本サービスは、個人情報の漏えい・滅失・毀損を防止するため、アクセス制御や暗号化など、
          合理的な安全対策を講じます。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">7. ポリシーの変更</h2>
        <p>
          本ポリシーは、必要に応じて改定される場合があります。重要な変更がある場合は、
          本サービス上でお知らせします。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-bold">8. お問い合わせ</h2>
        <p>
          本ポリシーに関するお問い合わせは、以下の連絡先までお願いいたします。
        </p>
        <p>メール: gunji.mamoru@gmail.com</p>
      </section>
    </main>
  );
}
