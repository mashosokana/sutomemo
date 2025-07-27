declare module "fabric" {
  export class Canvas {
    constructor(el: HTMLCanvasElement);
    add(object: object): void;
    dispose(): void;
    toDataURL(options: { format: string; multiplier: number }): string;
    setDimensions(dimensions: { width: number; height: number }): void;
    getActiveObject(): unknown;
    renderAll(): void;
    setActiveObject(object: object): void;
  }

  export class Textbox {
    constructor(
      text: string,
      options?: {
        left?: number;
        top?: number;
        fontSize?: number;
        fontFamily?: string;
        fill?: string;
      }
    );
    set(options: { fontSize?: number; fontFamily?: string }): void;
  }

  export class FabricImage {
    width?: number;
    height?: number;
    set(options: Record<string, unknown>): void;
    static fromURL(
      url: string,
      options?: Record<string, unknown>
    ): Promise<FabricImage>;
  }
}
