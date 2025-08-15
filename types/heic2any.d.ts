// src/types/heic2any.d.ts
declare module "heic2any" {
  export type Heic2AnyMime = "image/jpeg" | "image/png" | `image/${string}`;
  export interface Heic2AnyOptions {
    blob: Blob;
    toType?: Heic2AnyMime;
    quality?: number; // 0〜1
  }
  
  export type Heic2AnyResult = Blob | Blob[];
  export default function heic2any(options: Heic2AnyOptions): Promise<Heic2AnyResult>;
}
