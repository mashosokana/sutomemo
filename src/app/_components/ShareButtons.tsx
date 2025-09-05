// src/app/_components/ShareButtons.tsx
"use client";

import { shareText } from "@/utils/share";

type ShareProps = {
  text: string;
  disabledReason?: string; // 値があれば disabled + title 表示
  className?: string;
};

function Btn({
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const base = "text-white px-3 py-1 rounded text-sm ";
  const color = disabled ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:opacity-80";
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={base + color + (className ? " " + className : "")}> 
      {children}
    </button>
  );
}

export function ShareX({ text, disabledReason, className }: ShareProps) {
  const disabled = !!disabledReason;
  return (
    <div className={"flex gap-2 " + (className ?? "")}> 
      <Btn onClick={() => shareText(text, "x")} disabled={disabled} title={disabled ? disabledReason : undefined}>
        Xで共有
      </Btn>
    </div>
  );
}

export function ShareThreads({ text, disabledReason, className }: ShareProps) {
  const disabled = !!disabledReason;
  return (
    <div className={"flex gap-2 " + (className ?? "")}> 
      <Btn onClick={() => shareText(text)} disabled={disabled} title={disabled ? disabledReason : undefined}>
        共有
      </Btn>
    </div>
  );
}
