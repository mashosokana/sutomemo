//src/_components/MemberGateButton.tsx
'use client';
import { MouseEventHandler } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthMe } from '../hooks/useAuthMe'; 

type Props = {
  onAllow: () => void | Promise<void>;      
  labelMember: string;                      
  labelGuest?: string;                      
  className?: string;
  disabled?: boolean;
};

export default function MemberGateButton({
  onAllow, labelMember, labelGuest = '登録して続行', className, disabled,
}: Props) {
  const router = useRouter();
  const { data, loading } = useAuthMe();
  const isGuest = data?.isGuest ?? false;

  const handleClick: MouseEventHandler<HTMLButtonElement> = async (ev) => {
    ev.preventDefault();
    if (disabled || loading) return;
    if (isGuest) {
      router.push('/signup');               // ★ ゲストは登録へ誘導
      return;
    }
    await onAllow();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? '...' : (isGuest ? (labelGuest ?? labelMember) : labelMember)}
    </button>
  );
}
