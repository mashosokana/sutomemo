//src/app/_components/ImageFileInput.tsx
'use client';

import { convertIfHeic } from '@/lib/convertHeic';

type Props = {
  onPick: (files: File[]) => void;  
  accept?: string;
  to?: 'image/jpeg' | 'image/png';
  quality?: number;
  multiple?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export default function ImageFileInput({
  onPick,
  accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif',
  to = 'image/jpeg',
  quality = 0.9,
  multiple = true,
  disabled = false,
  id,
  className,
}: Props) {
  return (
    <input
      id={id}
      className={className}
      type="file"
      multiple={multiple}
      accept={accept}
      disabled={disabled}
      onChange={async (e) => {
        const input = e.currentTarget;

        const picked = Array.from(input.files ?? []);
        if (picked.length === 0) return;

        const converted = await Promise.all(
          picked.map((f) => convertIfHeic(f, to, quality))
        );

        console.table(converted.map(f => ({ name: f.name, type: f.type })));

        onPick(converted);

        input.value = '';
      }}
    />
  );
}
