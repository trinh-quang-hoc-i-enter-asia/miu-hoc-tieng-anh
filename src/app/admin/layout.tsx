import Link from "next/link";
import { currentStaff } from "@/lib/staff-auth";
import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  return (
    <div className="ui">
      <nav className="topbar" style={{ marginBottom: 8 }}>
        <div className="row">
          <b>Miu · Soạn bài</b>
          {staff && <Link className="btn" href="/admin">Danh sách bài</Link>}
        </div>
        {staff && (
          <div className="row">
            <span className="muted">{staff.email}</span>
            <LogoutButton />
          </div>
        )}
      </nav>
      {children}
    </div>
  );
}
