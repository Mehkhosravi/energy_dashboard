import { useState } from "react";

type AdminSection = "account" | "upload" | "validate";

type AdminPanelProps = {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
};

export default function AdminPanel({ active, onChange }: AdminPanelProps) {
  return (
    <aside className="side-panel">
      <div className="side-header">Admin</div>

      <div className="side-body">
        <AdminItem
          label="Account"
          active={active === "account"}
          onClick={() => onChange("account")}
        />
        <AdminItem
          label="Upload data"
          active={active === "upload"}
          onClick={() => onChange("upload")}
        />
        <AdminItem
          label="Validate data"
          active={active === "validate"}
          onClick={() => onChange("validate")}
        />
      </div>
    </aside>
  );
}

function AdminItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`admin-nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
