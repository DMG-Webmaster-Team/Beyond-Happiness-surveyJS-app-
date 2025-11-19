declare module "html-to-image" {
  export function toSvg(node: HTMLElement, options?: any): Promise<string>;
  export function toPng(node: HTMLElement, options?: any): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: any): Promise<string>;
  export function toBlob(node: HTMLElement, options?: any): Promise<Blob | null>;
  export function getFontEmbedCSS(node: HTMLElement, options?: any): Promise<string>;
}

declare module "downloadjs" {
  export default function download(
    data: string | Blob,
    filename?: string,
    mimeType?: string
  ): void;
}



