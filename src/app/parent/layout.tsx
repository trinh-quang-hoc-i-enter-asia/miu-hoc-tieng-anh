import Link from "next/link";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ui">
      <nav className="topbar" style={{ marginBottom: 8 }}>
        <div className="row">
          <Link className="btn" href="/">← Màn hình của bé</Link>
          <Link className="btn" href="/parent">Tổng quan</Link>
          <Link className="btn" href="/parent/settings">Tài khoản</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
