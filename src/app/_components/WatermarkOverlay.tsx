//src/_components/WatermarkOverlay.tsx
'use client';
import { ReactNode } from 'react';
import { useAuthMe } from '../hooks/useAuthMe'; 

type Props = { children: ReactNode; text?: string };

export default function WatermarkOverlay({ children, text = 'SutoMemo • Trial' }: Props) {
  const { data } = useAuthMe();
  const isGuest = data?.isGuest ?? false;

  return (
    <div className="relative">
      {children}
      {isGuest && (
        <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="font-bold tracking-wider rotate-[-18deg] text-center watermark-text">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
