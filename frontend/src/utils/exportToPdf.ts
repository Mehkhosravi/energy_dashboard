// src/utils/exportToPdf.ts
import jsPDF from "jspdf";
import type { ExportedImage } from "./exportToImage";

export function createPdfWithImages(options: {
  header: string;
  footer: string;
  images: ExportedImage[];
}) {
  const { header, footer, images } = options;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 12;
  const marginTop = 18;
  const marginBottom = 14;

  // First page header
  pdf.setFontSize(16);
  pdf.text(header, marginX, marginTop);

  let y = marginTop + 10;

  images.forEach((img) => {
    const availableWidth = pageWidth - 2 * marginX;
    const aspectRatio = img.width / img.height;

    const imgWidth = availableWidth;
    const imgHeight = imgWidth / aspectRatio;

    // New page if not enough space
    if (y + imgHeight + marginBottom > pageHeight) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text(header, marginX, marginTop);
      y = marginTop + 10;
    }

    pdf.setFontSize(11);
    pdf.text(img.label, marginX, y - 3);

    pdf.addImage(img.dataUrl, "PNG", marginX, y, imgWidth, imgHeight);

    y += imgHeight + 10;
  });

  // Footer on every page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.text(
      `${footer} · Page ${i}/${pageCount}`,
      marginX,
      pageHeight - 6
    );
  }

  return pdf;
}
