// src/components/data-import/DataPreviewTable.tsx
export default function DataPreviewTable() {
  return (
    <div className="side-section">
      <button className="side-section-header" type="button">
        <span className="side-section-title">Data preview</span>
      </button>

      <div className="side-section-body">
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th align="left">Month</th>
                <th align="right">Value</th>
                <th align="left">Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>January</td>
                <td align="right">12 345</td>
                <td style={{ color: "green" }}>OK</td>
              </tr>
              <tr>
                <td>February</td>
                <td align="right">—</td>
                <td style={{ color: "#f59e0b" }}>Missing</td>
              </tr>
              <tr>
                <td>March</td>
                <td align="right">980 000</td>
                <td style={{ color: "#f97316" }}>Outlier</td>
              </tr>
              <tr>
                <td>April</td>
                <td align="right">45 678</td>
                <td style={{ color: "green" }}>OK</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
