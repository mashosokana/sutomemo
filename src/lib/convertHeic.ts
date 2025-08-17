// /src/lib/convertHeic.ts
export async function convertIfHeic(
  file: File,
  to: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.9
): Promise<File> {
  const looksHeic =
    /image\/hei(c|f)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

  if (!looksHeic) return file;
  if (typeof window === 'undefined') return file;

  try {
    const mod = await import('heic2any');
    const convert = mod.default as (opts: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;

    const q = Math.max(0, Math.min(1, quality));
    const out = await convert({ blob: file, toType: to, quality: q });
    const blob = Array.isArray(out) ? (out[0] ?? null) : out;
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/g, '');
    const ext = to === 'image/png' ? '.png' : '.jpg';
    const newName = (base || 'image') + ext;

    return new File([blob], newName, { type: to, lastModified: file.lastModified });
  } catch (e) {
    console.error('HEIC変換に失敗:', e);
    return file;
  }
}
