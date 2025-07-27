"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Canvas, Textbox, FabricImage } from "fabric";
import { supabase } from "@/lib/supabase";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";

export default function EditImagePage() {
  const { id } = useParams();
  const { token } = useSupabaseSession();

  const canvasRef = useRef<Canvas | null>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#000000");

  const [caption, setCaption] = useState<string>("");
  const [answerWhy, setAnswerWhy] = useState<string>("");
  const [answerWhat, setAnswerWhat] = useState<string>("");
  const [answerNext, setAnswerNext] = useState<string>("");

  useEffect(() => {
    const fetchImageAndMemo = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/posts/${id}`, { headers });
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`);

        const data = await res.json();
        const post = data.post;

        setCaption(post.caption ?? "");
        setAnswerWhy(post.memo?.answerWhy ?? "");
        setAnswerWhat(post.memo?.answerWhat ?? "");
        setAnswerNext(post.memo?.answerNext ?? "");

        const imageKey = post.images?.[0]?.imageKey ?? null;
        if (imageKey) {
          const { data: publicData } = supabase.storage
            .from("post-images")
            .getPublicUrl(imageKey);
          setImageUrl(publicData?.publicUrl ?? null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchImageAndMemo();
  }, [id, token]);

  useEffect(() => {
    if (!canvasEl.current) return;

    const canvas = new Canvas(canvasEl.current);
    canvasRef.current = canvas;

    if (imageUrl) {
      FabricImage.fromURL(imageUrl).then((img) => {
        const maxWidth = 300;
        const maxHeight = 400;
        const scale = Math.min(
          maxWidth / (img.width || maxWidth),
          maxHeight / (img.height || maxHeight)
        );

        if ("scale" in img) {
          (img as unknown as { scale: (n: number) => void }).scale(scale);
        }

        img.set({ selectable: false });
        canvas.add(img);
        canvas.setDimensions({ width: maxWidth, height: maxHeight });

        const texts = [caption, answerWhy, answerWhat, answerNext].filter(Boolean);
        texts.forEach((text, i) => {
          const textbox = new Textbox(text, {
            left: 20,
            top: 20 + i * 60,
            fontSize,
            fontFamily,
            fill: fontColor,
          });
          canvas.add(textbox);
        });
      });
    }

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, caption, answerWhy, answerWhat, answerNext, fontFamily, fontSize, fontColor]);

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL({
      format: "png",
      multiplier: 1,
    });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `post-${id}-memo.png`;
    link.click();
  };

  const updateFontSize = (size: number) => {
    setFontSize(size);
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      if (obj instanceof Textbox) {
        obj.set({ fontSize: size });
      }
    });
    canvas.requestRenderAll(); 
  };

  const updateFontFamily = (family: string) => {
    setFontFamily(family);
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      if (obj instanceof Textbox) {
        obj.set({ fontFamily: family });
      }
    });
    canvas.requestRenderAll();
  };

  const updateFontColor = (color: string) => {
    setFontColor(color);
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      if (obj instanceof Textbox) {
        obj.set({ fill: color });
      }
    });
    canvas.requestRenderAll();
  };

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-4">画像にメモを追加</h1>

      <div className="mb-4 flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2">
          フォントサイズ:
          <input
            type="range"
            min="12"
            max="72"
            value={fontSize}
            onChange={(e) => updateFontSize(Number(e.target.value))}
          />
        </label>

        <label className="flex items-center gap-2">
          フォント:
          <select
            value={fontFamily}
            onChange={(e) => updateFontFamily(e.target.value)}
            className="border rounded p-1"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times</option>
            <option value="Courier New">Courier</option>
            <option value="monospace">Monospace</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          文字色:
          <input
            type="color"
            value={fontColor}
            onChange={(e) => updateFontColor(e.target.value)}
          />
        </label>
      </div>

      <div className="flex justify-center mb-4">
        <canvas ref={canvasEl} className="border" width={400} height={400} />
      </div>

      <div className="flex justify-center">
        <button
          onClick={downloadImage}
          className="px-6 py-2 bg-black text-white rounded hover:opacity-80"
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}
