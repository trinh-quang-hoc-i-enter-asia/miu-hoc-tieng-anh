import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParentPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { avatarSvg, ICONS } from "@/lesson-engine/art";

/** Màn hình đầu của bé: chạm vào ảnh của mình để vào học. */
export default async function ChooseProfile() {
  const parent = await requireParentPage();
  const children = await db.child.findMany({ where: { parentId: parent.id }, orderBy: { createdAt: "asc" } });
  // Chỉ có một bé thì vẫn hiện màn hình chọn, để hai bé dùng chung máy không bị nhầm.
  if (children.length === 0) redirect("/gate?next=/parent/children/new");

  return (
    <div className="kid-app">
      <header className="bar">
        <span className="spacer" />
        <span />
        <Link className="iconbtn" href="/gate?next=/parent" aria-label="Dành cho bố mẹ" dangerouslySetInnerHTML={{ __html: ICONS.parent }} />
      </header>
      <main className="kid-stage">
        <div className="hero">
          <h1>Miu học tiếng Anh</h1>
          <p>Con là ai nhỉ?</p>
        </div>
        <div className="profiles">
          {children.map((c) => (
            <Link key={c.id} href={`/kid/${c.id}`} className="profile" aria-label={`Bé ${c.nickname}`}>
              <span className="card" dangerouslySetInnerHTML={{ __html: avatarSvg(c.avatarKey) }} />
              <span>{c.nickname}</span>
            </Link>
          ))}
        </div>
        <p className="note">Bố mẹ bật âm thanh và ngồi cùng bé nhé. Mỗi bài dài khoảng 5 phút.</p>
      </main>
    </div>
  );
}
