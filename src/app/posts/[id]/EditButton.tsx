//app/posts/[id]/EditButton.tsx
'use client';

import { useRouter } from "next/navigation";

type Props = {
  postId: number;
  disabled?: boolean;
};

export default function EditButton({ postId, disabled = false }: Props) {
  const router = useRouter();

  return (
    <button
      className={`mt-4 px-4 py-2 rounded transition ${
        disabled ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      onClick={() => {
        if (!disabled) {
          router.push(`/compose/input/${postId}`);
        }
      }}
      disabled={disabled}
    >
      編集する
    </button>
  );
}
