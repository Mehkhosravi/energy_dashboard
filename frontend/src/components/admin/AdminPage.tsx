import { useState } from "react";
import DataImportPage from "../pages/data-import/DataImportPage";

type AdminTab = "account" | "upload";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("account");

  return (
    <div className="charts">
      <div className="chart-row">
        {/* LEFT */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Admin</h3>
            <p className="chart-subtitle">Account settings and data management</p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              className="icon-btn-sm"
              onClick={() => setTab("account")}
              style={{
                width: "auto",
                padding: "6px 12px",
                borderRadius: 999,
                border: tab === "account" ? "1px solid #111827" : "1px solid #d1d5db",
              }}
            >
              👤 Account
            </button>

            <button
              className="icon-btn-sm"
              onClick={() => setTab("upload")}
              style={{
                width: "auto",
                padding: "6px 12px",
                borderRadius: 999,
                border: tab === "upload" ? "1px solid #111827" : "1px solid #d1d5db",
              }}
            >
              ⬆️ Upload data
            </button>
          </div>

          {/* Content */}
          <div className="chart-container" style={{ gap: 12 }}>
            {tab === "account" ? <AccountPanel /> : <DataImportPage />}
          </div>
        </div>

        {/* RIGHT */}
        <div className="chart-insight">
          <h4 className="chart-insight-title">Admin panel</h4>
          <p className="chart-insight-text">
            • Account details<br />
            • Permissions (later)<br />
            • Upload & validate files<br />
            • Import to database (later)
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountPanel() {
  return (
    <div className="side-section">
      <button className="side-section-header" type="button">
        <span className="side-section-title">Account</span>
      </button>

      <div className="side-section-body">
        <div className="side-option-group">
          <div className="side-option">
            <strong>Name:</strong> <span style={{ marginLeft: 6 }}>User</span>
          </div>
          <div className="side-option">
            <strong>Role:</strong> <span style={{ marginLeft: 6 }}>Admin</span>
          </div>
          <div className="side-option">
            <strong>Email:</strong> <span style={{ marginLeft: 6 }}>user@example.com</span>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <button className="btn">Edit (later)</button>
        </div>
      </div>
    </div>
  );
}
