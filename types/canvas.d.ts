// src/types/canvas.d.ts
export {};

declare global {
  interface CanvasRenderingContext2D {
    imageSmoothingQuality?: "low" | "medium" | "high";
  }
}
