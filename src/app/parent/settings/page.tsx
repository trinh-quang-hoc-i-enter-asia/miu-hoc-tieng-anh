import { requireParentGate } from "@/lib/guard";
import { SettingsActions } from "./SettingsActions";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const parent = await requireParentGate("/parent/settings");
  return (
    <main>
      <h1>Tài khoản</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        <p>Email: <b>{parent.email}</b></p>
        <SettingsActions />
      </div>
    </main>
  );
}
