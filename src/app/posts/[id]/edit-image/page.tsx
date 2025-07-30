"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Canvas, Textbox, FabricImage } from "fabric";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";

interface CanvasWithEl extends Canvas {
  lowerCanvasEl: HTMLCanvasElement;
  centerObject(object: FabricImage): void;
  getWidth(): number;
  getHeight(): number;
}

interface ScalableFabricImage extends FabricImage {
  getScaledWidth(): number;
  getScaledHeight(): number;
  setCoords(): void;
}

interface ScalableTextbox extends Textbox {
  width: number;
  fontSize?: number;
  editable?: boolean;
  getScaledHeight(): number;
  setCoords(): void;
}

export default function EditImagePage() {
  const { id } = useParams();
  const { token } = useSupabaseSession();

  const canvasRef = useRef<CanvasWithEl | null>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<ScalableFabricImage | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [answerWhy, setAnswerWhy] = useState<string>("");
  const [answerWhat, setAnswerWhat] = useState<string>("");
  const [answerNext, setAnswerNext] = useState<string>("");

  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#000000");

  useEffect(() => {
    const fetchImageAndMemo = async () => {
      if (!token) return;
      const res = await fetch(`/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const post = data.post;
      setCaption(post.caption ?? "");
      setAnswerWhy(post.memo?.answerWhy ?? "");
      setAnswerWhat(post.memo?.answerWhat ?? "");
      setAnswerNext(post.memo?.answerNext ?? "");

      const firstImageUrl = post.images?.[0]?.signedUrl ?? null;
      setImageUrl(firstImageUrl);
    };

    fetchImageAndMemo();
  }, [id, token]);

  const fitImageToCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    if (!img.width || !img.height) return;

    const scale = Math.min(
      canvasWidth / img.width,
      canvasHeight / img.height
    );

    img.scale(scale);
    img.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: "center",
      originY: "center",
    });
    img.setCoords();
    canvas.requestRenderAll();
  };

  const addTextsToCanvas = (
    canvas: CanvasWithEl,
    texts: string[],
    fontSize: number,
    fontFamily: string,
    fontColor: string
  ) => {
    let currentTop = 20;
    const padding = 20;
    const maxWidth = canvas.getWidth() - padding * 2;

    texts.forEach((text) => {
      const textbox = new Textbox(text, {
        left: padding,
        top: currentTop,
        fontSize,
        fontFamily,
        fill: fontColor,
      }) as unknown as ScalableTextbox;

      textbox.width = maxWidth;
      textbox.editable = true;

      canvas.add(textbox);

      while (
        textbox.getScaledHeight() + currentTop > canvas.getHeight() - padding &&
        (textbox.fontSize ?? 12) > 10
      ) {
        textbox.fontSize = (textbox.fontSize ?? 12) - 2;
        textbox.setCoords();
      }

      currentTop += textbox.getScaledHeight() + 20; 
    });

    canvas.requestRenderAll();
  };

  useEffect(() => {
    if (!canvasEl.current) return;
    const canvas = new Canvas(canvasEl.current) as CanvasWithEl;
    canvasRef.current = canvas;

    const resizeCanvas = () => {
      if (!canvasRef.current) return;
      const maxWidth = Math.min(window.innerWidth * 0.8, 600); 
      const maxHeight = 400;

      canvasRef.current.setDimensions({ width: maxWidth, height: maxHeight });
      fitImageToCanvas();
    };

    window.addEventListener("resize", resizeCanvas);

    if (imageUrl) {
      FabricImage.fromURL(imageUrl).then((img) => {
        const image = img as ScalableFabricImage;
        image.set({ selectable: false });
        imageRef.current = image;
        canvas.add(image);

        fitImageToCanvas();

        const texts = [caption, answerWhy, answerWhat, answerNext].filter(Boolean);
        addTextsToCanvas(canvas, texts, fontSize, fontFamily, fontColor);
      });
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.dispose();
    };
  }, [imageUrl, caption, answerWhy, answerWhat, answerNext, fontSize, fontFamily, fontColor]);

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL({ format: "png", multiplier: 1 });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `post-${id}-memo.png`;
    link.click();
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    if (!canvasRef.current) return;
    canvasRef.current.getObjects().forEach((obj) => {
      if (obj instanceof Textbox) (obj as ScalableTextbox).fontSize = size;
    });
    canvasRef.current.requestRenderAll();
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    if (!canvasRef.current) return;
    canvasRef.current.getObjects().forEach((obj) => {
      if (obj instanceof Textbox) obj.set({ fontFamily: family });
    });
    canvasRef.current.requestRenderAll();
  };

  const handleFontColorChange = (color: string) => {
    setFontColor(color);
    if (!canvasRef.current) return;
    canvasRef.current.getObjects().forEach((obj) => {
      if (obj instanceof Textbox) obj.set({ fill: color });
    });
    canvasRef.current.requestRenderAll();
  };

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-4">画像編集（メモ追加）</h1>

      <div className="mb-4 flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2">
          フォントサイズ:
          <input
            type="range"
            min="12"
            max="72"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          />
        </label>

        <label className="flex items-center gap-2">
          フォント:
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
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
            onChange={(e) => handleFontColorChange(e.target.value)}
          />
        </label>
      </div>

      <div className="flex justify-center mb-4">
        <canvas ref={canvasEl} className="border" />
      </div>

      <div className="flex justify-center">
        <button
          onClick={downloadImage}
          className="px-6 py-2 bg-black text-white rounded hover:opacity-80"
        >
          完成画像をダウンロード
        </button>
      </div>
    </main>
  );
}
