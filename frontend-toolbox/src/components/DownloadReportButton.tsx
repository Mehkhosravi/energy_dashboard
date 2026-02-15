// src/components/DownloadReportButton.tsx
import React, { useState } from "react";
import { elementToPng } from "../utils/exportToImage";
import { createPdfWithImages } from "../utils/exportToPdf";

interface Props {
  chartRefs: Record<string, HTMLElement | null>;
  provinceName: string;
}

const DownloadReportButton: React.FC<Props> = ({ chartRefs, provinceName }) => {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);

    try {
      const images = [];

      for (const [key, element] of Object.entries(chartRefs)) {
        if (!element) continue;

        const prettyLabel = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const exported = await elementToPng(element, prettyLabel);
        images.push(exported);
      }

      if (images.length === 0) {
        console.warn("DownloadReport: no charts found to export.");
        alert("No charts found to export yet.");
        return;
      }

      const header = `EnergyDashboard Report – ${provinceName || "Unknown"}`;
      const footer = "© EnergyDashboard 2025";

      const pdf = createPdfWithImages({
        header,
        footer,
        images,
      });

      pdf.save(`EnergyDashboard_${provinceName || "report"}.pdf`);
    } catch (err) {
      console.error("Error while preparing the PDF report:", err);
      alert("Something went wrong while preparing the report. Check console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="download-btn"
    >
      {loading ? "Preparing report..." : "Download report"}
    </button>
  );
};

export default DownloadReportButton;
