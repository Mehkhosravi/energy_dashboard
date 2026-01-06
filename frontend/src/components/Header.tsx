// src/components/Header.tsx
import React, { useEffect, useRef, useState } from "react";

type MenuItem = "account" | "logout";

type HeaderProps = {
  onOpenAdmin?: () => void;     // open Admin page (Account/Upload)
  onCloseAdmin?: () => void;    // ✅ make optional
  onLogout?: () => void;        // later: real logout
  userName?: string;
  userRole?: string;
};

export default function Header({
  onOpenAdmin,
  onCloseAdmin, // ✅ comma fixed by putting it as a separate line
  onLogout,
  userName = "User",
  userRole = "Admin",
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handlePick = (item: MenuItem) => {
    setOpen(false);
    if (item === "account") onOpenAdmin?.();
    if (item === "logout") onLogout?.();
  };

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">M</span>
        <span className="header-title">MyDashboard</span>
      </div>

      <div className="header-right">
        <div ref={wrapRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="user-pill"
            onClick={() => setOpen((v) => !v)}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div className="user-avatar">{userName.slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </button>

          {open && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 200,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
                overflow: "hidden",
                zIndex: 6000,
              }}
              role="menu"
            >
              <button
                type="button"
                onClick={() => handlePick("account")}
                style={menuBtnStyle}
                role="menuitem"
              >
                <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}>
                  ⚙️
                </span>
                Account & settings
              </button>

              <div style={{ height: 1, background: "#e5e7eb" }} />

              <button
                type="button"
                onClick={() => handlePick("logout")}
                style={menuBtnStyle}
                role="menuitem"
              >
                <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}>
                  🚪
                </span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const menuBtnStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  gap: 8,
};
