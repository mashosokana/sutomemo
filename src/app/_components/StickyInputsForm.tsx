// src/app/_components/StickyInputsForm.tsx
"use client";

type StickyValues = {
  tagline: string;
  place: string;
  tool: string;
  people: string;
  numbers: string; // カンマ区切り入力（例: 3, 20%, 5分）
  sense: string;   // 五感のヒント
  cta: string;
};

type Props = {
  values: StickyValues;
  onChange: (patch: Partial<StickyValues>) => void;
  className?: string;
};

export default function StickyInputsForm({ values, onChange, className }: Props) {
  const boxClass =
    "w-full border px-3 py-2 rounded text-black bg-white placeholder:text-gray-400 " +
    "min-h-10 leading-relaxed";

  return (
    <div className={className ?? "space-y-4"}>
      <div className="font-semibold">やさしい5質問（そのまま使えるラベル）</div>

      {/* 1. 今日をひと言で？ */}
      <div>
        <label className="block text-sm font-semibold mb-1">１．今日をひと言で？（10文字以内）</label>
        <input
          type="text"
          className={boxClass}
          value={values.tagline}
          onChange={(e) => onChange({ tagline: e.target.value.slice(0, 10) })}
          placeholder="例：バズより記憶派／朝3分ルール／現場メモ始動（空欄OK）"
        />
        <p className="text-xs text-gray-500 mt-1">ヒント：迷ったら空欄OK。後で自動生成でも可。</p>
      </div>

      {/* 2. どこで・何を使った？（自由記入） */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">２．どこで・何を使った？（自由記入）</div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-gray-600 mb-1">場所</span>
            <input
              type="text"
              className={boxClass}
              value={values.place}
              onChange={(e) => onChange({ place: e.target.value })}
              placeholder="例：自宅／現場／車内／カフェ など"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-gray-600 mb-1">道具</span>
            <input
              type="text"
              className={boxClass}
              value={values.tool}
              onChange={(e) => onChange({ tool: e.target.value })}
              placeholder="例：SutoMemo／軍手／ドライバー／PC など"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-sm text-gray-600 mb-1">人</span>
            <input
              type="text"
              className={boxClass}
              value={values.people}
              onChange={(e) => onChange({ people: e.target.value })}
              placeholder="例：一人／妻／先生／お客さま など"
            />
          </label>
        </div>
      </div>

      {/* 3. 数字（自由記入・カンマ区切り） */}
      <div className="space-y-1">
        <div className="text-sm font-semibold">３．数字を1つ選ぶ（複数可）</div>
        <input
          type="text"
          className={boxClass}
          value={values.numbers}
          onChange={(e) => onChange({ numbers: e.target.value })}
          placeholder="例：1分, 3分, 5分, 10分 / 本日, 3日, 7日 / 1回, 3回, 1枚 など（カンマ区切り）"
        />
        <p className="text-xs text-gray-500">ヒント：ピッタリでなくても“だいたい”でOK。</p>
      </div>

      {/* 4. 感覚（自由記入） */}
      <div className="space-y-1">
        <div className="text-sm font-semibold">４．今日いちばん覚えている感覚は？（短く）</div>
        <input
          type="text"
          className={boxClass}
          value={values.sense}
          onChange={(e) => onChange({ sense: e.target.value })}
          placeholder="例：ドライバーの音／ゴムの匂い／冷たい朝／ざらざらした紙"
        />
      </div>

      {/* 5. CTA（自由記入） */}
      <div className="space-y-1">
        <div className="text-sm font-semibold">５．見た人に何をしてほしい？（1つだけ）</div>
        <input
          type="text"
          className={boxClass}
          value={values.cta}
          onChange={(e) => onChange({ cta: e.target.value })}
          placeholder="例：保存する／試してみる／質問する／シェアする／プロフを見る"
        />
      </div>
    </div>
  );
}
