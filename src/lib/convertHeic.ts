export async function convertIfHeic(
  file: File,
  to: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.9
): Promise<File> {
  const looksHeic =
    /image\/hei(c|f)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

  if (!looksHeic) return file; 

  
  if (typeof window === 'undefined') return file;

  const { default: heic2any } = await import('heic2any');
  const outBlob = await heic2any({
    blob: file,
    toType: to,
    quality,
  });

  const newName = file.name.replace(/\.(heic|heif)$/i, to === 'image/png' ? '.png' : '.jpg');

  return new File([outBlob], newName, { type: to, lastModified: file.lastModified });
}
