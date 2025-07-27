import "fabric";

declare module "fabric" {
  interface Canvas {
    getObjects(): fabric.Object[];
    requestRenderAll(): void;
  }

  interface Textbox {
    set(options: { fontSize?: number; fontFamily?: string; fill?: string }): void;
  }

  interface FabricImage {
    scale(scale: number): void;
  }
}

