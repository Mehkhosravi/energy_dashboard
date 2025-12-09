import html2canvas from "html2canvas";

export async function elementToPng(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
  });
  return canvas.toDataURL("image/png");
}
