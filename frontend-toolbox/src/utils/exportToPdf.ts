import jsPDF from "jspdf";

export function createPdfPage({
  header,
  footer,
  images
}: {
  header: string;
  footer: string;
  images: { label: string; dataUrl: string }[];
}) {
  const pdf = new jsPDF({ unit: "px", format: "a4" });

  // Header
  pdf.setFontSize(18);
  pdf.text(header, 20, 30);

  let y = 70;

  images.forEach((img) => {
    pdf.setFontSize(12);
    pdf.text(img.label, 20, y - 10);
    pdf.addImage(img.dataUrl, "PNG", 20, y, 380, 220);
    y += 260;

    if (y > 780) {
      pdf.addPage();
      y = 70;
    }
  });

  // Footer (last page)
  pdf.setFontSize(10);
  pdf.text(footer, 20, 810);

  return pdf;
}
