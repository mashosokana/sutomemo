// app/posts/[id]/page.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { PostDetail, PostImage } from '../../../../types/post';

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { token, session } = useSupabaseSession();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState<PostImage | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const postId = Number(params.id);
  const [textBoxSize, setTextBoxSize] = useState({ width: 300, height: 120 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isGuest, setIsGuest] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    setIsGuest(session?.user?.email === 'guest@example.com');
  }, [session]);

  useEffect(() => {
    if (!token || isNaN(postId)) return;

    if (isGuest) return; 

    const fetchPost = async () => {
      const res = await fetch(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const fetchedPost = data.post as PostDetail;
      setPost(fetchedPost);
      const combinedText = [
        fetchedPost.caption,
        fetchedPost.memo?.answerWhy,
        fetchedPost.memo?.answerWhat,
        fetchedPost.memo?.answerNext,
      ].filter(Boolean).join('\n\n');
      setText(combinedText);
      setImage(fetchedPost.images?.[fetchedPost.images.length - 1] ?? null);
    };

    fetchPost();
  }, [token, postId, isGuest]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !token) return;

    setIsProcessing(true);
    try {
      const file = e.target.files[0];

      if (isGuest) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage({
            id: -1,
            signedUrl: reader.result as string,
            imageKey: '',
          });
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      if (image?.imageKey) {
        await fetch(`/api/posts/${postId}/images`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageKey: image.imageKey }),
        });
      }

      const res = await fetch(`/api/posts/${postId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.image) setImage(data.image);
    } finally {
      setIsProcessing(false); 
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current || !image?.signedUrl) return;

    setIsProcessing(true);
    try {
      const link = document.createElement('a');
      link.download = `post-${postId}-with-text.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !image?.signedUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = image.signedUrl;

    img.onload = () => {
      const width = 270;
      const scale = width / img.width;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const clampedX = Math.min(Math.max(0, dragOffset.x), width - textBoxSize.width);
      const clampedY = Math.min(Math.max(0, dragOffset.y), height - textBoxSize.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(clampedX, clampedY, textBoxSize.width, textBoxSize.height);

      ctx.fillStyle = '#fff';
      let pixelSize = 14;
      if (fontSize === 'small') pixelSize = 12;
      if (fontSize === 'large') pixelSize = 18;

      ctx.font = `${pixelSize}px sans-serif`;
      ctx.textBaseline = 'top';

      const lines = text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, clampedX + 10, clampedY + 10 + i * (pixelSize + 4));
      });

      if (clampedX !== dragOffset.x || clampedY !== dragOffset.y) {
        setDragOffset({ x: clampedX, y: clampedY });
      }
    };
  }, [image, text, textBoxSize, dragOffset, fontSize]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const startX = e.nativeEvent.offsetX;
    const startY = e.nativeEvent.offsetY;
    const initialX = dragOffset.x;
    const initialY = dragOffset.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.offsetX - startX;
      const dy = moveEvent.offsetY - startY;
      setDragOffset({ x: initialX + dx, y: initialY + dy });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (isGuest) {
    return <p className="text-center mt-8 text-gray-500">お試しユーザーでは保存されません（画面上のみ反映されます）</p>;
  }

  if (!post) {
    return <p className="text-center mt-8 text-gray-500">読み込み中...</p>;
  }

  return (
    <main className="flex flex-col items-center p-2 max-w-2xl mx-auto bg-white text-black">
      <h1 className="text-base font-semibold mb-2">投稿編集</h1>

      <div className="space-y-4 w-full flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          className="border w-[270px] h-auto"
        />

        <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer">
          ギャラリー / ファイル選択
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full border p-2 rounded"
          disabled={isProcessing}
        />

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2">
            幅:
            <input
              type="range"
              min={100}
              max={260}
              value={textBoxSize.width}
              onChange={(e) =>
                setTextBoxSize((size) => ({ ...size, width: Number(e.target.value) }))
              }
              disabled={isProcessing}
            />
          </label>
          <label className="flex items-center gap-2">
            高さ:
            <input
              type="range"
              min={50}
              max={480}
              value={textBoxSize.height}
              onChange={(e) =>
                setTextBoxSize((size) => ({ ...size, height: Number(e.target.value) }))
              }
              disabled={isProcessing}
            />
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setFontSize('small')}
            className={`px-4 py-2 rounded ${fontSize === 'small' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}
            disabled={isProcessing}
          >小</button>
          <button
            onClick={() => setFontSize('medium')}
            className={`px-4 py-2 rounded ${fontSize === 'medium' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}
            disabled={isProcessing}
          >中</button>
          <button
            onClick={() => setFontSize('large')}
            className={`px-4 py-2 rounded ${fontSize === 'large' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}
            disabled={isProcessing}
          >大</button>
        </div>

        <button
          onClick={handleDownload}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
          disabled={isProcessing}
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}
