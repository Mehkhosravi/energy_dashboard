// src/utils/exportToImage.ts
import html2canvas from "html2canvas";

export interface ExportedImage {
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

export async function elementToPng(
  element: HTMLElement,
  label: string
): Promise<ExportedImage> {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
  });

  return {
    label,
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}
