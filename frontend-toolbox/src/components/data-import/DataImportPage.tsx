// src/components/data-import/DataImportPage.tsx
import ImportContextPanel from "./ImportContextPanel";
import FileUploadCard from "./FileUploadCard";
import DataPreviewTable from "./DataPreviewTable";

export default function DataImportPage() {
  return (
    <div className="charts">
      <div className="chart-row">
        {/* LEFT: main import content */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Data Import</h3>
            <p className="chart-subtitle">
              Upload and validate energy data before inserting into the database
            </p>
          </div>

          <div className="chart-container">
            <ImportContextPanel />
            <FileUploadCard />
            <DataPreviewTable />
          </div>
        </div>

        {/* RIGHT: guidance / checklist */}
        <div className="chart-insight">
          <h4 className="chart-insight-title">Import checklist</h4>
          <p className="chart-insight-text">
            • Select spatial level<br />
            • Choose energy domain & source<br />
            • Upload CSV or Excel file<br />
            • Review nulls and inconsistencies<br />
            • Confirm before importing
          </p>
        </div>
      </div>
    </div>
  );
}
