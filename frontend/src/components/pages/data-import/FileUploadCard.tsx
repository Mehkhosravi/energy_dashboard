// src/components/data-import/FileUploadCard.tsx
export default function FileUploadCard() {
  return (
    <div className="side-section">
      <button className="side-section-header" type="button">
        <span className="side-section-title">Upload file</span>
      </button>

      <div className="side-section-body">
        <div
          style={{
            border: "1px dashed #d1d5db",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
            background: "#f9fafb",
            fontSize: 13,
          }}
        >
          <p style={{ margin: 0 }}>
            Drag & drop CSV or XLSX file here
          </p>

          <p style={{ margin: "6px 0", color: "#6b7280" }}>
            or
          </p>

          <button className="btn">
            Select file
          </button>
        </div>
      </div>
    </div>
  );
}
