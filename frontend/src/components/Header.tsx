// src/components/Header.tsx

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">M</span>
        <span className="header-title">MyDashboard</span>
      </div>

      <div className="header-right">
        <button className="btn">+ New</button>
        <div className="user-pill">
          <div className="user-avatar">U</div>
          <div className="user-info">
            <div className="user-name">User</div>
            <div className="user-role">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
