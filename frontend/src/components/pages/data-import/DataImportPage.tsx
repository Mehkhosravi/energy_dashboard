// src/components/data-import/DataImportPage.tsx
import ImportContextPanel from "./ImportContextPanel";
import FileUploadCard from "./FileUploadCard";
import DataPreviewTable from "./DataPreviewTable";

export default function DataImportPage() {
  return (
    <div className="import-page">
      <div className="import-grid">
        {/* LEFT: main import content */}
        <section className="import-main">
          <div className="import-head">
            <h2 className="import-title">Data Import</h2>
            <p className="import-subtitle">
              Upload and validate energy data before inserting into the database
            </p>
          </div>

          <div className="import-stack">
            <ImportContextPanel />
            <FileUploadCard />
            <DataPreviewTable />
          </div>
        </section>

        {/* RIGHT: checklist */}
        <aside className="import-aside">
          <h4 className="import-aside-title">Import checklist</h4>

          <ul className="import-checklist">
            <li>Select spatial level</li>
            <li>Choose energy domain & source</li>
            <li>Upload CSV or Excel file</li>
            <li>Review nulls and inconsistencies</li>
            <li>Confirm before importing</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
