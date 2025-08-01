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
  left?: number;
  top?: number;
  getScaledWidth(): number;
  getScaledHeight(): number;
  setCoords(): void;
}

interface ScalableTextbox extends Textbox {
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  backgroundColor?: string;
  originX?: string;
  originY?: string;
  top?: number;
  left?: number;
  selectable?: boolean;
  editable?: boolean;
  hasControls?: boolean;
  textAlign?: string;
  lineHeight?: number;
  getScaledHeight(): number;
  setCoords(): void;
  calcTextHeight(): number;
  on(eventName: string, handler: (e: unknown) => void): void;
}

export default function EditImagePage() {
  const { id } = useParams();
  const { token } = useSupabaseSession();

  const canvasRef = useRef<CanvasWithEl | null>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<ScalableFabricImage | null>(null);
  const textboxRef = useRef<ScalableTextbox | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [answerWhy, setAnswerWhy] = useState<string>("");
  const [answerWhat, setAnswerWhat] = useState<string>("");
  const [answerNext, setAnswerNext] = useState<string>("");

  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#000000");
  const [lineHeight, setLineHeight] = useState(1.2);
  const [bgColor, setBgColor] = useState("transparent");
  const [showControls, setShowControls] = useState(false);

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

    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);

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

  const addTextToCanvas = (
    canvas: CanvasWithEl,
    image: ScalableFabricImage,
    text: string,
    fontSize: number,
    fontFamily: string,
    fontColor: string,
    backgroundColor: string,
    lineHeight: number
  ) => {
    const textbox = new Textbox(text, {
      fontSize,
      fontFamily,
      fill: fontColor,
    }) as ScalableTextbox;
  
    textbox.backgroundColor = backgroundColor; // ← ✅ ここで後から設定
    textbox.editable = true;
    textbox.selectable = true;
    textbox.textAlign = "center";
    textbox.hasControls = false;
    textbox.lineHeight = lineHeight;
  
    const boxWidth = canvas.getWidth() * 0.8;
    textbox.width = boxWidth;
    textbox.height = textbox.calcTextHeight(); // 高さをテキスト内容に応じて計算
    textbox.left = image.left!;
    textbox.top = image.top!;
    textbox.originX = "center";
    textbox.originY = "center";
  
    textbox.on("selected", () => setShowControls(true));
    textbox.on("deselected", () => setShowControls(false));
  
    textboxRef.current = textbox;
    canvas.add(textbox);
    textbox.setCoords();
    canvas.requestRenderAll();
  };
  

  useEffect(() => {
    if (!canvasEl.current) return;
    const canvas = new Canvas(canvasEl.current) as CanvasWithEl;
    canvasRef.current = canvas;

    const resizeCanvas = () => {
      if (!canvasRef.current) return;
      const maxWidth = Math.min(window.innerWidth * 0.8, 340);
      const maxHeight = maxWidth * (4 / 3);
      canvas.setDimensions({ width: maxWidth, height: maxHeight });

      fitImageToCanvas();

      if (textboxRef.current) {
        textboxRef.current.width = canvas.getWidth() * 0.8;
        textboxRef.current.height = textboxRef.current.calcTextHeight();
        textboxRef.current.left = canvas.getWidth() / 2;
        textboxRef.current.originX = "center";
        textboxRef.current.setCoords();
        canvas.requestRenderAll();
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    if (imageUrl) {
      FabricImage.fromURL(imageUrl).then((img) => {
        const image = img as ScalableFabricImage;
        image.set({ selectable: false });
        imageRef.current = image;
        canvas.add(image);

        fitImageToCanvas();

        const combinedText = [caption, answerWhy, answerWhat, answerNext]
          .filter(Boolean)
          .join("\n\n");

        addTextToCanvas(
          canvas,
          image,
          combinedText,
          fontSize,
          fontFamily,
          fontColor,
          bgColor,
          lineHeight
        );
      });
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.dispose();
    };
  }, [imageUrl, caption, answerWhy, answerWhat, answerNext, fontSize, fontFamily, fontColor, lineHeight, bgColor]);

  const updateTextboxStyle = (updates: Partial<ScalableTextbox>) => {
    const textbox = textboxRef.current;
    const canvas = canvasRef.current;
    if (!textbox || !canvas) return;

    Object.assign(textbox, updates);
    textbox.width = canvas.getWidth() * 0.8;
    textbox.height = textbox.calcTextHeight();
    textbox.left = canvas.getWidth() / 2;
    textbox.originX = "center";
    textbox.setCoords();
    canvas.requestRenderAll();
  };

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-4">画像編集（メモ追加）</h1>

      {showControls && (
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2">
            フォントサイズ:
            <input
              type="range"
              min="12"
              max="72"
              value={fontSize}
              onChange={(e) => {
                const size = Number(e.target.value);
                setFontSize(size);
                updateTextboxStyle({ fontSize: size });
              }}
            />
          </label>

          <label className="flex items-center gap-2">
            フォント:
            <select
              value={fontFamily}
              onChange={(e) => {
                const family = e.target.value;
                setFontFamily(family);
                updateTextboxStyle({ fontFamily: family });
              }}
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
              onChange={(e) => {
                const color = e.target.value;
                setFontColor(color);
                updateTextboxStyle({ fill: color });
              }}
            />
          </label>

          <label className="flex items-center gap-2">
            背景色:
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                const color = e.target.value;
                setBgColor(color);
                updateTextboxStyle({ backgroundColor: color });
              }}
            />
          </label>

          <label className="flex items-center gap-2">
            行間:
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={lineHeight}
              onChange={(e) => {
                const lh = Number(e.target.value);
                setLineHeight(lh);
                updateTextboxStyle({ lineHeight: lh });
              }}
            />
          </label>
        </div>
      )}

      <div className="flex justify-center mb-4">
        <canvas ref={canvasEl} className="border max-h-[640px]" />
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => {
            if (!canvasRef.current) return;
            const dataURL = canvasRef.current.toDataURL({ format: "png", multiplier: 1 });
            const link = document.createElement("a");
            link.href = dataURL;
            link.download = `post-${id}-memo.png`;
            link.click();
          }}
          className="px-6 py-2 bg-black text-white rounded hover:opacity-80"
        >
          完成画像をダウンロード
        </button>
      </div>
    </main>
  );
}